/**
 * src/lib/sentry.ts
 * Rastreabilidade: INT-091, INT-092, SEC-008, TASK-4/ST001
 * Helpers Sentry + sanitização de PII antes de envio
 */
import * as Sentry from '@sentry/nextjs'
import type { Event } from '@sentry/nextjs'
import { sanitizeForLog, PII_FIELDS } from '@/lib/log-sanitizer'

/**
 * Sanitiza evento Sentry removendo campos PII (SEC-008)
 * Chamado em beforeSend() — nunca expõe dados pessoais ao Sentry
 */
export function sanitizeSentryEvent(event: Event): Event {
  // Sanitizar extra
  if (event.extra) {
    event.extra = sanitizeForLog(event.extra) as Record<string, unknown>
  }

  // Sanitizar contextos
  if (event.contexts) {
    for (const key of Object.keys(event.contexts)) {
      if (event.contexts[key] && typeof event.contexts[key] === 'object') {
        event.contexts[key] = sanitizeForLog(event.contexts[key]) as Record<string, unknown>
      }
    }
  }

  // Sanitizar user — manter apenas id, nunca email ou nome
  if (event.user) {
    event.user = {
      id: event.user.id,
      // email e username intencionalmente removidos (SEC-008)
    }
  }

  // Sanitizar request body se presente
  if (event.request?.data) {
    event.request.data = sanitizeForLog(event.request.data) as string | Record<string, unknown> | undefined
  }

  return event
}

/**
 * Captura exceção no Sentry com contexto sanitizado
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(sanitizeForLog(context) as Record<string, unknown>)
    }
    Sentry.captureException(error)
  })
}

/**
 * Captura mensagem informacional no Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level)
}

// Re-exportar PII_FIELDS para uso nos configs de Sentry
export { PII_FIELDS }
