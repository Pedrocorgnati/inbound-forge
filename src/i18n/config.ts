import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'en-US', 'it-IT', 'es-ES'],
  defaultLocale: 'pt-BR',
  pathnames: {
    '/blog': {
      'pt-BR': '/blog',
      'en-US': '/blog',
      'it-IT': '/blog',
      'es-ES': '/blog',
    },
  },
})

export type Locale = (typeof routing.locales)[number]
