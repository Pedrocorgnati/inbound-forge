/**
 * Queue Manager — module-12-calendar-publishing
 * Lógica de fallback para fila com backoff exponencial e marcação de FAILED permanente.
 * INT-021 | FEAT-publishing-blog-001 | CL-063
 */
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { logPublishAttempt } from '@/lib/audit/publish-audit'
import { PUBLISHING_QUEUE } from '@/lib/constants/publishing'
import { createAlertIfAbsent } from '@/lib/services/alert.service'
import { captureException, captureMessage } from '@/lib/sentry'

/** Categorias de erro para classificacao do motivo de rejeicao do Instagram */
export type PublishFailureCategory =
  | 'RATE_LIMIT'
  | 'IMAGE_TOO_SMALL'
  | 'CAPTION_TOO_LONG'
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'MEDIA_PROCESSING'
  | 'UNKNOWN'

/** Retorna a categoria do erro e intervalo de retry recomendado em minutos */
function categorizeError(error: Error): { category: PublishFailureCategory; retryDelayMs: number | null } {
  const msg = error.message.toLowerCase()
  const code = (error as Error & { code?: string }).code

  if (code === 'SYS_002' || msg.includes('429') || msg.includes('rate limit')) {
    return { category: 'RATE_LIMIT', retryDelayMs: PUBLISHING_QUEUE.rateLimitRetryHours * 60 * 60 * 1000 }
  }
  if (code === 'IMG_001' || msg.includes('image_too_small')) {
    return { category: 'IMAGE_TOO_SMALL', retryDelayMs: null } // nao vai resolver sozinho
  }
  if (code === 'IMG_002' || msg.includes('caption_too_long')) {
    return { category: 'CAPTION_TOO_LONG', retryDelayMs: null } // nao vai resolver sozinho
  }
  if (msg.includes('token') || msg.includes('401') || msg.includes('expired')) {
    return { category: 'TOKEN_EXPIRED', retryDelayMs: 5 * 60 * 1000 } // 5min após renovação
  }
  if (msg.includes('permission') || msg.includes('403')) {
    return { category: 'PERMISSION_DENIED', retryDelayMs: null }
  }
  if (msg.includes('timeout') || msg.includes('status_code')) {
    return { category: 'MEDIA_PROCESSING', retryDelayMs: 10 * 60 * 1000 } // 10min
  }
  return { category: 'UNKNOWN', retryDelayMs: null }
}

/**
 * Retorna post para fila com backoff exponencial baseado em attempts.
 * Rate limit (HTTP 429) usa janela fixa de 1h sem incrementar attempts.
 * Rastreabilidade: CL-063, TASK-3 ST002
 */
export async function handlePublishFailure(
  postId: string,
  error: Error,
  attempts: number
): Promise<void> {
  const { category, retryDelayMs } = categorizeError(error)
  const errorWithCategory = `[${category}] ${error.message}`

  if (category === 'RATE_LIMIT') {
    const rescheduleAt = new Date(Date.now() + (retryDelayMs ?? 3_600_000))
    await PublishingQueueService.returnToQueue(postId, errorWithCategory)
    await logPublishAttempt({
      postId,
      action: 'queue_retry',
      result: 'failure',
      errorMessage: `Rate limit — reagendado para ${rescheduleAt.toISOString()}`,
      attempts,
    })
    return
  }

  const newAttempts = attempts + 1

  // Erros sem retry ou attempts esgotados: marcar como FAILED permanente
  const noRetry = retryDelayMs === null
  const attemptsExhausted = newAttempts >= PUBLISHING_QUEUE.maxAttempts

  if (noRetry || attemptsExhausted) {
    await PublishingQueueService.markPermanentlyFailed(postId, errorWithCategory)
    await logPublishAttempt({
      postId,
      action: 'permanent_fail',
      result: 'failure',
      errorMessage: errorWithCategory,
      attempts: newAttempts,
    })

    // Notificar operador via AlertService
    await createAlertIfAbsent({
      type: 'PUBLISH_PERMANENT_FAIL',
      severity: 'HIGH',
      message: `Post ${postId} falhou permanentemente após ${newAttempts} tentativas: ${errorWithCategory}`,
    }).catch((e) => {
      captureException(e, { service: 'queue-manager', step: 'create-alert' })
    })

    captureMessage(`[queue-manager] Post ${postId} FAILED permanente após ${newAttempts} tentativas — categoria: ${category}`, 'error')
    return
  }

  // Tentativa com backoff
  await PublishingQueueService.returnToQueue(postId, errorWithCategory)
  await logPublishAttempt({
    postId,
    action: 'queue_retry',
    result: 'failure',
    errorMessage: errorWithCategory,
    attempts: newAttempts,
  })
}

export { categorizeError }
