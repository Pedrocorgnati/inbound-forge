import type { NextResponse } from 'next/server'
import { CSRF_COOKIE_NAME, TOKEN_TTL_MS, generateCsrfToken, verifyCsrfToken } from '@/lib/csrf'

export { CSRF_COOKIE_NAME, generateCsrfToken, verifyCsrfToken }

export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(TOKEN_TTL_MS / 1000),
  })
  return response
}

export function readCsrfFromRequest(request: Request): { header: string | null; cookie: string | null } {
  const header = request.headers.get('x-csrf-token')
  const cookieHeader = request.headers.get('cookie') || ''
  const cookieMatch = cookieHeader
    .split(/;\s*/)
    .map((p) => p.split('='))
    .find(([k]) => k === CSRF_COOKIE_NAME)
  const cookie = cookieMatch ? decodeURIComponent(cookieMatch[1] ?? '') : null
  return { header, cookie }
}
