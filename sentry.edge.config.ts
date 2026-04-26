/**
 * sentry.edge.config.ts
 * Inicializa Sentry no runtime Edge (middleware).
 * Mantido mínimo — edge runtime tem restrições de API.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
