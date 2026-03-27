/**
 * sentry.server.config.ts
 * Rastreabilidade: INT-091, INT-092, TASK-4/ST001
 * Inicializa Sentry no lado servidor (Node.js/Edge)
 */
import * as Sentry from '@sentry/nextjs'
import { sanitizeSentryEvent } from '@/lib/sentry'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Amostragem de performance — 10% em produção
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Remover PII antes de enviar para Sentry (SEC-008)
  beforeSend(event) {
    return sanitizeSentryEvent(event)
  },
})
