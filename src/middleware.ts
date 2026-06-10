import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/types'
import { validateCallbackUrl } from '@/lib/auth/callback-validation'
import { verifyCsrfToken, readCsrfFromRequest } from '@/lib/auth/csrf-token'
// Intake-Review TASK-19 ST001 (CL-OP-033): rate-limit granular em /api/blog/*.
import { checkBlogPublicRateLimit, extractClientIp } from '@/lib/rate-limit/blog-public'

const PUBLIC_PATHS = ['/login', '/blog', '/diagnostico']
const API_PUBLIC_PATHS = ['/api/health', '/api/v1/health', '/api/auth', '/api/v1/diagnostico']
const ONBOARDING_PATH = '/onboarding'

const CSRF_MUTATIVE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CSRF_WHITELIST_PREFIXES = [
  '/api/v1/csrf',
  '/api/v1/auth',
  '/api/v1/diagnostico',
  '/api/webhooks',
  '/api/auth',
]

function requiresCsrfCheck(method: string, pathname: string): boolean {
  if (!CSRF_MUTATIVE_METHODS.has(method)) return false
  if (!pathname.startsWith('/api/')) return false
  if (CSRF_WHITELIST_PREFIXES.some((p) => pathname.startsWith(p))) return false
  return true
}

// AUDIT-1: rotas que aceitam Bearer WORKER_AUTH_TOKEN (chamadas backend->backend dos
// workers Railway, SEM cookie de sessao). O proprio handler valida via requireWorkerToken;
// sem esta isencao o gate de sessao 401-ava o worker antes (ex.: publishing-worker ->
// /api/instagram/publish). So pula o gate de SESSAO quando ha header Bearer; o handler
// continua sendo o gate de auth real (rejeita Bearer invalido).
const WORKER_TOKEN_PATHS = ['/api/instagram/publish', '/api/v1/health/heartbeat', '/api/workers/']
export function isCronExemptPath(pathname: string): boolean {
  return pathname.startsWith('/api/cron/')
}
export function isWorkerTokenRequest(pathname: string, request: Pick<NextRequest, 'headers'>): boolean {
  if (!WORKER_TOKEN_PATHS.some((p) => pathname.startsWith(p))) return false
  return request.headers.get('authorization')?.startsWith('Bearer ') ?? false
}

function isPublicPath(pathname: string): boolean {
  // Remove locale prefix
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  return (
    PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p)) ||
    API_PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p) || pathname.startsWith(p))
  )
}

// loop 05-27 TAREFA-028 (P3): a propria pagina de desafio MFA nao pode ser gateada
// pelo proprio gate de AAL (evita loop de redirect).
function isMfaChallengePath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  return withoutLocale === '/mfa-challenge' || withoutLocale.startsWith('/mfa-challenge/')
}

// loop 05-27 TAREFA-028 (fix REPROVADO): o gate de AAL2 deve cobrir TAMBEM as APIs
// protegidas (a versao anterior so gateava paginas, permitindo bypass por sessao AAL1
// chamando /api/*). Apenas o proprio fluxo de enrolamento/recovery do MFA + health
// permanecem acessiveis em AAL1, senao o usuario nunca conseguiria completar/desativar
// o segundo fator. Mantem-se a isencao de /onboarding e da pagina de desafio.
const MFA_GATE_EXEMPT_API_PREFIXES = [
  '/api/health',
  '/api/v1/health',
  '/api/auth',
  '/api/v1/auth', // login + mfa setup/verify/challenge/disable (enroll + recovery)
  '/api/v1/csrf',
]

function isMfaGateExempt(pathname: string): boolean {
  if (isMfaChallengePath(pathname)) return true
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  if (
    withoutLocale === ONBOARDING_PATH ||
    withoutLocale.startsWith(`${ONBOARDING_PATH}/`)
  ) {
    return true
  }
  if (MFA_GATE_EXEMPT_API_PREFIXES.some((p) => pathname.startsWith(p))) return true
  return false
}

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    // GA4 (googletagmanager) + Vercel live preview
    // unsafe-eval necessário no dev para React Refresh (hot reload)
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''} https://vercel.live https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com",
    // Sentry tunnel em /monitoring (não *.ingest.sentry.io diretamente)
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://app.posthog.com https://*.ingest.sentry.io https://www.google-analytics.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function extractLocale(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname.startsWith(`/${locale}`)) return locale
  }
  return DEFAULT_LOCALE
}

export function shouldRedirectToOnboarding(
  pathname: string,
  onboardingCookie: string | undefined,
  isDevMode: boolean,
): boolean {
  if (isDevMode) return false
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  // Match exato ou com sub-path: /onboarding ou /onboarding/* (não /onboarding-fake)
  const isOnboardingPath =
    withoutLocale === ONBOARDING_PATH || withoutLocale.startsWith(`${ONBOARDING_PATH}/`)
  if (isOnboardingPath) return false
  const isApiPath = pathname.startsWith('/api/')
  if (isApiPath) return false
  return onboardingCookie !== '1'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static/api health
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname === '/api/v1/health' ||
    pathname === '/api/health' ||
    // AUDIT-1: crons sao autenticados pelo PROPRIO handler (Bearer CRON_SECRET).
    // Vercel Cron dispara GET sem cookie de sessao; sem este skip o gate fail-closed
    // 401-ava TODOS os crons (lgpd-purge, reconciliation, token-expiration, etc.) antes
    // do handler rodar — ou seja, nenhum cron executava em producao.
    isCronExemptPath(pathname)
  ) {
    return NextResponse.next()
  }

  // Rate-limit em APIs publicas do blog (nao-admin). Aplica antes de CSRF/auth.
  // Intake-Review TASK-19 ST001 (CL-OP-033).
  if (
    pathname.startsWith('/api/blog/') &&
    !pathname.startsWith('/api/blog-articles') // admin path
  ) {
    const ip = extractClientIp(request.headers)
    const rl = await checkBlogPublicRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Muitas requisicoes. Tente novamente em breve.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSeconds),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': String(rl.remaining),
          },
        },
      )
    }
  }

  // Redirect root to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url))
  }

  // Check if path has locale prefix (API routes nunca levam prefixo de locale)
  const hasLocale = SUPPORTED_LOCALES.some((l) => pathname.startsWith(`/${l}`))
  if (!hasLocale && !pathname.startsWith('/api/')) {
    // TASK-15 ST001 (CL-319): detectar locale inválido (ex: /zz-ZZ/...) e redirecionar 308
    const LOCALE_PATTERN = /^\/([a-z]{2}(?:-[A-Z]{2})?)(\/.*)$/
    const localeMatch = pathname.match(LOCALE_PATTERN)
    if (localeMatch) {
      // Parece locale mas não está na lista suportada — redirect 308 para default
      const rest = localeMatch[2] ?? '/'
      const acceptLang = request.headers.get('accept-language') ?? ''
      const preferred = SUPPORTED_LOCALES.find((l) => acceptLang.includes(l.split('-')[0]))
      const target = preferred ?? DEFAULT_LOCALE
      return NextResponse.redirect(new URL(`/${target}${rest}${request.nextUrl.search}`, request.url), 308)
    }
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url))
  }

  const locale = extractLocale(pathname)

  // Nonce único por request para CSP (SEC-003)
  const nonce = btoa(String.fromCharCode(...Array.from(crypto.getRandomValues(new Uint8Array(16)))))
  const csp = buildCSP(nonce)

  // Allow public paths — ainda seta nonce/CSP para consistência
  if (isPublicPath(pathname)) {
    const response = NextResponse.next()
    response.headers.set('x-nonce', nonce)
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  // Protected routes — check auth (fail-closed)
  try {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // AUDIT-1: chamadas backend->backend dos workers (Bearer token, sem cookie)
      // passam direto — o handler valida via requireWorkerToken.
      if (isWorkerTokenRequest(pathname, request)) {
        return NextResponse.next()
      }
      // Fail-closed: sem sessão → redirect login com returnTo (SEC-003)
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { code: 'SESSION_REQUIRED', message: 'Autenticacao necessaria' },
          { status: 401 }
        )
      }
      const { sanitized } = validateCallbackUrl(pathname)
      const loginUrl = new URL(`/${locale}/login`, request.url)
      // Intake Review TASK-6 ST004 (CL-276): expor `redirect` (novo) e manter
      // `returnTo` para compatibilidade com consumidores existentes.
      loginUrl.searchParams.set('redirect', sanitized)
      loginUrl.searchParams.set('returnTo', sanitized)
      return NextResponse.redirect(loginUrl)
    }

    // loop 05-27 TAREFA-028 (fix REPROVADO): gate de MFA — usuario autenticado em
    // AAL1 que possui um fator TOTP verificado deve completar o desafio (AAL2) antes
    // de acessar QUALQUER recurso protegido, paginas OU APIs. A versao anterior so
    // gateava paginas (`!pathname.startsWith('/api/')`), o que permitia bypass: uma
    // sessao AAL1 com MFA ativo chamava /api/* protegido sem TOTP. Agora o gate
    // cobre as APIs e e FAIL-CLOSED: se a checagem de AAL falhar, bloqueamos (403 em
    // API, redirect ao desafio em pagina) em vez de liberar. So o fluxo de
    // enrolamento/recovery do MFA, onboarding, health e a pagina de desafio ficam
    // isentos (ver isMfaGateExempt).
    if (!isMfaGateExempt(pathname)) {
      let mustChallenge = false
      try {
        const { data: aal, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalError || !aal) {
          // Fail-closed (SEC, fix residual do finding security/fail_open): o cliente
          // Supabase devolve `{ data, error }` SEM lancar excecao. A versao anterior
          // so capturava `data` e caia no catch apenas em throw real; um erro
          // nao-throw (ou data ausente) deixava `mustChallenge=false` e LIBERAVA o
          // recurso protegido enquanto o MFA podia estar ativo. Agora qualquer falha
          // da checagem AAL forca o desafio. Setup/recovery seguem isentos acima.
          mustChallenge = true
        } else {
          mustChallenge = aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1'
        }
      } catch {
        // Fail-closed (SEC, fix do finding security/fail_open): indisponibilidade da
        // checagem AAL nao pode liberar recurso protegido enquanto o MFA pode estar
        // ativo. O fluxo de enrolamento/recovery esta isento acima, entao um usuario
        // sem MFA nunca fica preso aqui em rota de setup.
        mustChallenge = true
      }
      if (mustChallenge) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { code: 'MFA_REQUIRED', message: 'Verificacao MFA (AAL2) necessaria' },
            { status: 403 }
          )
        }
        const { sanitized } = validateCallbackUrl(pathname)
        const challengeUrl = new URL(`/${locale}/mfa-challenge`, request.url)
        challengeUrl.searchParams.set('redirect', sanitized)
        return NextResponse.redirect(challengeUrl)
      }
    }

    // CSRF check em rotas mutativas protegidas (CL-272)
    if (requiresCsrfCheck(request.method, pathname)) {
      const { header, cookie } = readCsrfFromRequest(request)
      const token = header || ''
      const valid = token && cookie && token === cookie && verifyCsrfToken(token, user.id)
      if (!valid) {
        console.warn(`[csrf] rejected ${request.method} ${pathname} user=${user.id}`)
        return NextResponse.json(
          {
            code: header ? 'CSRF_TOKEN_INVALID' : 'CSRF_TOKEN_MISSING',
            message: 'Token CSRF ausente ou invalido',
          },
          { status: 403 }
        )
      }
    }

    // Guard de onboarding: usuário autenticado mas não onboardado → /onboarding
    const onboardingCookie = request.cookies.get('inbound_forge_onboarded')?.value
    const isDevMode = process.env.NODE_ENV === 'development'
    if (shouldRedirectToOnboarding(pathname, onboardingCookie, isDevMode)) {
      // Sem cookie → redirecionar para onboarding (cookie será setado ao completar via PATCH)
      return NextResponse.redirect(new URL(`/${locale}${ONBOARDING_PATH}`, request.url))
    }

    // Sessão válida: injetar nonce e CSP na resposta
    response.headers.set('x-nonce', nonce)
    response.headers.set('Content-Security-Policy', csp)
    return response
  } catch {
    // Fail-closed: qualquer erro → redirect login
    const errorLocale = extractLocale(pathname)
    return NextResponse.redirect(new URL(`/${errorLocale}/login`, request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
