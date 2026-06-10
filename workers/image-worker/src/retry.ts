// module-9: Retry + Dead-Letter Queue
// Rastreabilidade: TASK-1 ST003, INT-059, INT-083, FEAT-creative-generation-003
//
// WK-WRK-05: o re-enqueue de retry deixou de usar setTimeout em memoria (que se
// perde no restart/crash do worker, abandonando o job em PENDING para sempre) e
// passou a persistir no Redis sorted-set REDIS_RETRY_ZSET_KEY com score =
// timestamp do proximo retry. O consumer drena os vencidos a cada tick via
// drainDueRetries, entao um retry sobrevive a reinicios do worker.

import type { Redis } from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'
import { IMAGE_WORKER_CONFIG, REDIS_QUEUE_KEY, REDIS_DEAD_LETTER_KEY, REDIS_RETRY_ZSET_KEY, RETRY_BACKOFF_MS } from './constants'

export async function handleRetry(
  jobId: string,
  error: unknown,
  db: PrismaClient
): Promise<void> {
  const job = await db.imageJob.findUniqueOrThrow({ where: { id: jobId } })
  const newRetryCount = (job.retryCount ?? 0) + 1

  if (newRetryCount >= IMAGE_WORKER_CONFIG.deadLetterAfter) {
    // Dead-letter
    await db.imageJob.update({
      where: { id: jobId },
      data: {
        status:       'DEAD_LETTER',
        retryCount:   newRetryCount,
        errorMessage: String(error),
      },
    })

    const deadLetterPayload = JSON.stringify({
      jobId,
      error:         String(error),
      failedAt:      Date.now(),
      retryCount:    newRetryCount,
      contentPieceId: job.contentPieceId,
      templateId:    job.templateId,
    })

    // Enqueue to dead-letter (best-effort — not fatal if fails)
    try {
      const { getRedisClient } = await import('./redis-client')
      const redis = getRedisClient(process.env as never)
      await redis.rpush(REDIS_DEAD_LETTER_KEY, deadLetterPayload)
    } catch {
      // Log only — dead-letter enqueue failure is non-critical
    }

    log({ event: 'dead_letter', jobId, retryCount: newRetryCount, error: String(error), timestamp: new Date().toISOString() })
    return
  }

  // Re-enqueue with backoff — persistido no Redis ZSET (sobrevive a restart).
  const delayMs = RETRY_BACKOFF_MS[newRetryCount - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]
  const nextRetryAt = Date.now() + delayMs

  await db.imageJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', retryCount: newRetryCount },
  })

  try {
    const { getRedisClient } = await import('./redis-client')
    const redis = getRedisClient(process.env as never)
    await redis.zadd(REDIS_RETRY_ZSET_KEY, { score: nextRetryAt, member: jobId })
  } catch (err) {
    log({ event: 'retry_enqueue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
  }

  log({ event: 'job_retry', jobId, retryCount: newRetryCount, nextRetryAt: new Date(nextRetryAt).toISOString(), error: String(error), timestamp: new Date().toISOString() })
}

/**
 * Drena retries vencidos do ZSET para a fila principal. Chamado pelo consumer a
 * cada tick (transforma o consumer no 'relogio' que recupera retries persistidos).
 *
 * Atomicidade: usa o retorno de zrem (===1) como claim antes do rpush, evitando
 * duplo-requeue caso haja mais de uma replica do worker drenando o mesmo ZSET.
 * Defensivo: qualquer erro de Redis e logado, nunca derruba o loop do consumer.
 */
export async function drainDueRetries(redis: Redis): Promise<void> {
  const now = Date.now()

  let due: string[]
  try {
    due = await redis.zrange<string[]>(REDIS_RETRY_ZSET_KEY, 0, now, { byScore: true })
  } catch (err) {
    log({ event: 'retry_drain_failed', error: String(err), timestamp: new Date().toISOString() })
    return
  }

  for (const jobId of due) {
    try {
      const removed = await redis.zrem(REDIS_RETRY_ZSET_KEY, jobId)
      if (removed !== 1) continue // outro tick/replica ja reivindicou este job
      await redis.rpush(REDIS_QUEUE_KEY, JSON.stringify({ jobId }))
      log({ event: 'retry_requeued', jobId, timestamp: new Date().toISOString() })
    } catch (err) {
      log({ event: 'retry_requeue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
    }
  }
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
