// Cookie consent gate — LGPD/GDPR compliance
// Server-side: usar via cookies() do next/headers
// Client-side: usar via document.cookie

export type ConsentCategory = 'functional' | 'analytics' | 'marketing'

export interface CookieConsent {
  functional: true      // sempre concedido
  analytics: boolean
  marketing: boolean
  grantedAt?: string    // ISO date
}

const CONSENT_COOKIE_NAME = 'lgpd_consent'
const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 ano em segundos

// --- Client-side (browser) ---

export function getCookieConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1]))
  } catch {
    return null
  }
}

export function setCookieConsent(granted: boolean): void {
  if (typeof document === 'undefined') return
  const consent: CookieConsent = {
    functional: true,
    analytics: granted,
    marketing: granted,
    grantedAt: new Date().toISOString(),
  }
  const encoded = encodeURIComponent(JSON.stringify(consent))
  document.cookie = `${CONSENT_COOKIE_NAME}=${encoded}; max-age=${CONSENT_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

export function hasCookieConsent(): boolean {
  const consent = getCookieConsent()
  return consent !== null
}

export function hasConsentFor(category: ConsentCategory): boolean {
  if (category === 'functional') return true // sempre concedido
  const consent = getCookieConsent()
  if (!consent) return false
  return consent[category]
}

// --- Server-side helpers (Next.js App Router) ---
// Parsear cookie raw vindo de request.headers

export function parseConsentFromCookieHeader(cookieHeader: string): CookieConsent | null {
  const match = cookieHeader
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')))
  } catch {
    return null
  }
}

export function buildConsentCookieValue(granted: boolean): string {
  const consent: CookieConsent = {
    functional: true,
    analytics: granted,
    marketing: granted,
    grantedAt: new Date().toISOString(),
  }
  return encodeURIComponent(JSON.stringify(consent))
}

export function buildConsentSetCookieHeader(granted: boolean): string {
  const value = buildConsentCookieValue(granted)
  return `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
}
