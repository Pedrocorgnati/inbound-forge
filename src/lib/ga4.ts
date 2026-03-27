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
 * Verificação de consentimento: ga-consent cookie (set pelo CookieConsentProvider).
 */
export function trackEvent({ name, params }: TrackEventParams): void {
  if (typeof window === 'undefined') return

  // Gate de consentimento — CookieConsentProvider grava `analytics-consent` no cookie
  const hasConsent = document.cookie
    .split(';')
    .some((c) => c.trim().startsWith('analytics-consent=true'))
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
