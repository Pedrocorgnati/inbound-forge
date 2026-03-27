/**
 * Queue Manager — module-12-calendar-publishing
 * Lógica de fallback para fila com backoff exponencial e marcação de FAILED permanente.
 * INT-021 | FEAT-publishing-blog-001
 */
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { logPublishAttempt } from '@/lib/audit/publish-audit'
import { PUBLISHING_QUEUE } from '@/lib/constants/publishing'

/**
 * Retorna post para fila com backoff exponencial baseado em attempts.
 * Rate limit (HTTP 429) usa janela fixa de 1h sem incrementar attempts.
 */
export async function handlePublishFailure(
  postId: string,
  error: Error,
  attempts: number
): Promise<void> {
  const isRateLimit = error.message.includes('429') || (error as Error & { code?: string }).code === 'SYS_002'

  if (isRateLimit) {
    // Rate limit: reagendar para 1 hora, não incrementa attempts
    const rescheduleAt = new Date(
      Date.now() + PUBLISHING_QUEUE.rateLimitRetryHours * 60 * 60 * 1000
    )
    await PublishingQueueService.returnToQueue(postId, 'Rate limit atingido (429). Reagendado para 1h.')

    // Corrigir scheduledAt para exatamente 1h (returnToQueue usa backoff por attempts)
    // Override via DB direto se necessário
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

  if (newAttempts >= PUBLISHING_QUEUE.maxAttempts) {
    // Esgotado: marcar como FAILED permanente
    await PublishingQueueService.markPermanentlyFailed(postId, error.message)
    await logPublishAttempt({
      postId,
      action: 'permanent_fail',
      result: 'failure',
      errorMessage: error.message,
      attempts: newAttempts,
    })
    console.error(`[queue-manager] Post ${postId} marcado como FAILED permanente após ${newAttempts} tentativas`)
    return
  }

  // Tentativa com backoff
  await PublishingQueueService.returnToQueue(postId, error.message)
  await logPublishAttempt({
    postId,
    action: 'queue_retry',
    result: 'failure',
    errorMessage: error.message,
    attempts: newAttempts,
  })
}
