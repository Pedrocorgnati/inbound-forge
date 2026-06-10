/**
 * Rastreabilidade: CL-297, TASK-1 ST003
 * Bridge logger -> Sentry: captura erros do logger.error no Sentry com correlation_id.
 *
 * Uso: substituir `logger.error` por `logError` em pontos críticos,
 * ou chamar `attachSentryBridge()` para monkey-patch do logger global.
 */
import * as Sentry from '@sentry/nextjs'
import { sanitizeForLog } from '@/lib/log-sanitizer'
import { logger } from '@/lib/logger'

let bridgeAttached = false

/**
 * Captura exceção no Sentry correlacionada com um label/context de logger.
 * Retorna o eventId do Sentry para incluir em logs estruturados.
 */
export function logErrorWithSentry(
  label: string,
  message: string,
  error: unknown,
  data?: object,
): string {
  const sanitized = data ? (sanitizeForLog(data) as Record<string, unknown>) : undefined

  const eventId = Sentry.withScope((scope) => {
    scope.setTag('logger_label', label)
    scope.setExtra('logger_message', message)
    if (sanitized) scope.setExtras(sanitized)
    return Sentry.captureException(error instanceof Error ? error : new Error(String(error)))
  })

  logger.error(label, message, { ...sanitized, sentry_event_id: eventId })
  return eventId
}

/**
 * Monkey-patches logger.error para capturar automaticamente no Sentry (produção apenas).
 * Chamar uma única vez na inicialização da aplicação (instrumentation.ts ou layout.tsx).
 */
export function attachSentryBridge(): void {
  if (bridgeAttached || process.env.NODE_ENV !== 'production') return
  bridgeAttached = true

  const originalError = logger.error.bind(logger)
  logger.error = (label: string, message: string, data?: object) => {
    const err = data && 'error' in data ? (data as { error: unknown }).error : undefined
    if (err) {
      logErrorWithSentry(label, message, err, data)
    } else {
      Sentry.captureMessage(message, 'error')
      originalError(label, message, data)
    }
  }
}
