'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/components/consent/CookieConsentProvider'

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

// SECURITY: safeGA4Id é validado via regex antes de qualquer interpolação em dangerouslySetInnerHTML (A03/XSS)
// RESOLVED: G03 — DOMPurify não aplicável a template JS estático; regex /^G-[A-Z0-9]{4,12}$/ é a defesa correta
const GA4_ID_REGEX = /^G-[A-Z0-9]{4,12}$/
const safeGA4Id = GA4_ID && GA4_ID_REGEX.test(GA4_ID) ? GA4_ID : null

/**
 * Carrega o Google Analytics 4 SOMENTE se o usuário concedeu consentimento
 * para cookies de analytics. Nunca carrega GA4 sem consentimento (LGPD).
 */
export function GA4Script() {
  const { analyticsConsent } = useCookieConsent()

  if (!analyticsConsent || !safeGA4Id) return null

  return (
    <>
      <Script
        id="ga4-gtag"
        src={`https://www.googletagmanager.com/gtag/js?id=${safeGA4Id}`}
        strategy="afterInteractive"
        data-testid="ga4-script"
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${safeGA4Id}', {
              anonymize_ip: true,
              cookie_flags: 'SameSite=Lax;Secure'
            });
          `,
        }}
      />
    </>
  )
}
