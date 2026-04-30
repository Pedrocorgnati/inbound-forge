// ga4.ts — Helper de tracking GA4 com gate de consentimento
// INT-106 | COMP-003: somente dispara após analyticsConsent = true (LGPD/GDPR)
// SEC-008: sem PII nos eventos

import type { GA4EventName } from '@/constants/ga4-events'

interface TrackEventParams {
  name: GA4EventName
  params?: Record<string, string | number | boolean>
}

/**
 * Dispara um evento no GA4 via gtag().
 * Se o usuário não concedeu consentimento de analytics, o evento é descartado silenciosamente.
 * Verificação de consentimento: cookie lgpd_consent (JSON gravado pelo CookieConsentProvider).
 */
export function trackEvent({ name, params }: TrackEventParams): void {
  if (typeof window === 'undefined') return

  // Gate de consentimento — CookieConsentProvider grava `lgpd_consent` (JSON) no cookie
  const consentRaw = document.cookie
    .split('; ')
    .find((c) => c.startsWith('lgpd_consent='))
    ?.split('=')
    .slice(1)
    .join('=')
  let hasConsent = false
  try {
    hasConsent = consentRaw ? JSON.parse(decodeURIComponent(consentRaw)).analytics === true : false
  } catch {
    hasConsent = false
  }
  if (!hasConsent) return

  if (typeof window.gtag !== 'function') return

  window.gtag('event', name, params ?? {})
}

// Augment window para evitar erros de tipo com gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
