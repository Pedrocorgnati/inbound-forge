'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/components/consent/CookieConsentProvider'

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID

/**
 * Carrega o Google Analytics 4 SOMENTE se o usuário concedeu consentimento
 * para cookies de analytics. Nunca carrega GA4 sem consentimento (LGPD).
 */
export function GA4Script() {
  const { analyticsConsent } = useCookieConsent()

  if (!analyticsConsent || !GA4_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
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
            gtag('config', '${GA4_ID}', {
              anonymize_ip: true,
              cookie_flags: 'SameSite=Lax;Secure'
            });
          `,
        }}
      />
    </>
  )
}
