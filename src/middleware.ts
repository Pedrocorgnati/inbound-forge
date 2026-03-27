import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/types'
import { randomBytes } from 'crypto'
import { validateCallbackUrl } from '@/lib/auth/callback-validation'

const PUBLIC_PATHS = ['/login', '/blog']
const API_PUBLIC_PATHS = ['/api/v1/health', '/api/auth']
const ONBOARDING_PATH = '/onboarding'

function isPublicPath(pathname: string): boolean {
  // Remove locale prefix
  const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
  return (
    PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p)) ||
    API_PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  )
}

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://vercel.live`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io",
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
    pathname === '/api/v1/health'
  ) {
    return NextResponse.next()
  }

  // Redirect root to default locale
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, request.url))
  }

  // Check if path has locale prefix
  const hasLocale = SUPPORTED_LOCALES.some((l) => pathname.startsWith(`/${l}`))
  if (!hasLocale) {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url))
  }

  const locale = extractLocale(pathname)

  // Nonce único por request para CSP (SEC-003)
  const nonce = randomBytes(16).toString('base64')
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
      const { sanitized } = validateCallbackUrl(pathname)
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('returnTo', sanitized)
      return NextResponse.redirect(loginUrl)
    }

    // Guard de onboarding: usuário autenticado mas não onboardado → /onboarding
    const withoutLocale = pathname.replace(/^\/(pt-BR|en-US|it-IT|es-ES)/, '')
    const isOnboardingPath = withoutLocale.startsWith(ONBOARDING_PATH)
    const isApiPath = pathname.startsWith('/api/')
    const onboardingCookie = request.cookies.get('inbound_forge_onboarded')?.value

    if (!isOnboardingPath && !isApiPath && onboardingCookie !== '1') {
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
