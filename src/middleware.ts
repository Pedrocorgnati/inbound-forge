import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/types'
import { validateCallbackUrl } from '@/lib/auth/callback-validation'
import { verifyCsrfToken, readCsrfFromRequest } from '@/lib/auth/csrf-token'
// Intake-Review TASK-19 ST001 (CL-OP-033): rate-limit granular em /api/blog/*.
import { checkBlogPublicRateLimit, extractClientIp } from '@/lib/rate-limit/blog-public'

const PUBLIC_PATHS = ['/login', '/blog']
const API_PUBLIC_PATHS = ['/api/health', '/api/v1/health', '/api/auth']
const ONBOARDING_PATH = '/onboarding'

const CSRF_MUTATIVE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])
const CSRF_WHITELIST_PREFIXES = [
  '/api/v1/csrf',
  '/api/v1/auth',
  '/api/webhooks',
  '/api/auth',
]

function requiresCsrfCheck(method: string, pathname: string): boolean {
  if (!CSRF_MUTATIVE_METHODS.has(method)) return false
  if (!pathname.startsWith('/api/')) return false
  if (CSRF_WHITELIST_PREFIXES.some((p) => pathname.startsWith(p))) return false
  return true
}

function isPublicPath(pathname: string): boolean {
  // Remove locale prefix
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  return (
    PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p)) ||
    API_PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p) || pathname.startsWith(p))
  )
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static/api health
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname === '/api/v1/health' ||
    pathname === '/api/health'
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
    const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
    const isOnboardingPath = withoutLocale.startsWith(ONBOARDING_PATH)
    const isApiPath = pathname.startsWith('/api/')
    const onboardingCookie = request.cookies.get('inbound_forge_onboarded')?.value

    const isDevMode = process.env.NODE_ENV === 'development'
    if (!isDevMode && !isOnboardingPath && !isApiPath && onboardingCookie !== '1') {
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
