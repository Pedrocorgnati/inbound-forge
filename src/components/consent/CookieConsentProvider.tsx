'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsent,
} from '@/lib/lgpd/cookie-consent'

interface CookieConsentContextValue {
  analyticsConsent: boolean
  marketingConsent: boolean
  showBanner: boolean
  acceptAll: () => void
  declineAll: () => void
  saveCustom: (analytics: boolean, marketing: boolean) => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

/**
 * Grava consent customizado no cookie lgpd_consent.
 * Usa o mesmo formato do setCookieConsent mas permite valores independentes.
 */
function setCustomConsent(analytics: boolean, marketing: boolean): void {
  if (typeof document === 'undefined') return
  const consent: CookieConsent = {
    functional: true,
    analytics,
    marketing,
    grantedAt: new Date().toISOString(),
  }
  const maxAge = 365 * 24 * 60 * 60
  const encoded = encodeURIComponent(JSON.stringify(consent))
  document.cookie = `lgpd_consent=${encoded}; max-age=${maxAge}; path=/; SameSite=Lax`
}

interface CookieConsentProviderProps {
  children: ReactNode
}

export function CookieConsentProvider({ children }: CookieConsentProviderProps) {
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Leitura client-only do estado de consentimento
  useEffect(() => {
    const consent = getCookieConsent()
    if (consent === null) {
      setShowBanner(true)
    } else {
      setAnalyticsConsent(consent.analytics)
      setMarketingConsent(consent.marketing)
      setShowBanner(false)
    }
    setLoaded(true)
  }, [])

  const acceptAll = useCallback(() => {
    setCookieConsent(true)
    setAnalyticsConsent(true)
    setMarketingConsent(true)
    setShowBanner(false)
  }, [])

  const declineAll = useCallback(() => {
    setCookieConsent(false)
    setAnalyticsConsent(false)
    setMarketingConsent(false)
    setShowBanner(false)
  }, [])

  const saveCustom = useCallback((analytics: boolean, marketing: boolean) => {
    setCustomConsent(analytics, marketing)
    setAnalyticsConsent(analytics)
    setMarketingConsent(marketing)
    setShowBanner(false)
  }, [])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      analyticsConsent,
      marketingConsent,
      showBanner: loaded ? showBanner : false,
      acceptAll,
      declineAll,
      saveCustom,
    }),
    [analyticsConsent, marketingConsent, showBanner, loaded, acceptAll, declineAll, saveCustom]
  )

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error('useCookieConsent deve ser usado dentro de <CookieConsentProvider>')
  }
  return context
}
