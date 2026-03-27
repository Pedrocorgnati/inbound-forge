/**
 * sentry.client.config.ts
 * Rastreabilidade: INT-091, INT-092, TASK-4/ST001
 * Inicializa Sentry no lado cliente (browser)
 */
import * as Sentry from '@sentry/nextjs'
import { sanitizeSentryEvent } from '@/lib/sentry'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Amostragem de performance — 10% em produção para reduzir custos
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay de sessão apenas para erros
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Remover PII antes de enviar para Sentry (SEC-008)
  beforeSend(event) {
    return sanitizeSentryEvent(event)
  },

  // Integrations
  integrations: [
    Sentry.replayIntegration(),
  ],
})
