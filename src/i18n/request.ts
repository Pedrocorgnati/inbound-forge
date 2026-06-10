import { getRequestConfig } from 'next-intl/server'
import { IntlErrorCode } from 'next-intl'
import { routing } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Fallback para defaultLocale se locale inválido
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    // AUDIT-8: torna chaves i18n faltantes VISIVEIS em vez de renderizar a chave crua
    // silenciosamente. Em dev/test loga + marca com ⚠️ (pega gaps cedo); em prod
    // mantem o comportamento atual (renderiza o path da chave), sem lancar.
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] chave ausente: ${error.message}`)
        }
        return
      }
      console.error(`[i18n] ${error.message}`)
    },
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join('.')
      return process.env.NODE_ENV === 'production' ? path : `⚠️${path}`
    },
  }
})
