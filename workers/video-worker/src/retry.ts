// Video Worker: Retry + Dead-Letter Queue
//
// WK-WRK-05: re-enqueue de retry persistido no Redis sorted-set
// REDIS_VIDEO_RETRY_ZSET_KEY (score = proximo retry) em vez de setTimeout em
// memoria. O consumer drena os vencidos a cada tick via drainDueRetries.

import type { Redis } from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'
import { VIDEO_WORKER_CONFIG, REDIS_VIDEO_QUEUE_KEY, REDIS_VIDEO_DEAD_LETTER_KEY, REDIS_VIDEO_RETRY_ZSET_KEY, VIDEO_RETRY_BACKOFF_MS } from './constants'

export async function handleRetry(
  jobId: string,
  error: unknown,
  db: PrismaClient
): Promise<void> {
  const job = await db.videoJob.findUniqueOrThrow({ where: { id: jobId } })
  const newRetryCount = (job.retryCount ?? 0) + 1

  if (newRetryCount >= VIDEO_WORKER_CONFIG.deadLetterAfter) {
    await db.videoJob.update({
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
    })

    try {
      const { getRedisClient } = await import('./redis-client')
      const redis = getRedisClient(process.env as never)
      await redis.rpush(REDIS_VIDEO_DEAD_LETTER_KEY, deadLetterPayload)
    } catch {
      // dead-letter enqueue failure is non-critical
    }

    log({ event: 'dead_letter', jobId, retryCount: newRetryCount, error: String(error), timestamp: new Date().toISOString() })
    return
  }

  const delayMs = VIDEO_RETRY_BACKOFF_MS[newRetryCount - 1] ?? VIDEO_RETRY_BACKOFF_MS[VIDEO_RETRY_BACKOFF_MS.length - 1]
  const nextRetryAt = Date.now() + delayMs

  await db.videoJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', retryCount: newRetryCount },
  })

  try {
    const { getRedisClient } = await import('./redis-client')
    const redis = getRedisClient(process.env as never)
    await redis.zadd(REDIS_VIDEO_RETRY_ZSET_KEY, { score: nextRetryAt, member: jobId })
  } catch (err) {
    log({ event: 'retry_enqueue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
  }

  log({ event: 'job_retry', jobId, retryCount: newRetryCount, nextRetryAt: new Date(nextRetryAt).toISOString(), error: String(error), timestamp: new Date().toISOString() })
}

/**
 * Drena retries vencidos do ZSET para a fila principal. Espelho do image-worker.
 * Claim atomico via zrem (===1); defensivo contra erros de Redis.
 */
export async function drainDueRetries(redis: Redis): Promise<void> {
  const now = Date.now()

  let due: string[]
  try {
    due = await redis.zrange<string[]>(REDIS_VIDEO_RETRY_ZSET_KEY, 0, now, { byScore: true })
  } catch (err) {
    log({ event: 'retry_drain_failed', error: String(err), timestamp: new Date().toISOString() })
    return
  }

  for (const jobId of due) {
    try {
      const removed = await redis.zrem(REDIS_VIDEO_RETRY_ZSET_KEY, jobId)
      if (removed !== 1) continue
      await redis.rpush(REDIS_VIDEO_QUEUE_KEY, JSON.stringify({ jobId }))
      log({ event: 'retry_requeued', jobId, timestamp: new Date().toISOString() })
    } catch (err) {
      log({ event: 'retry_requeue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
    }
  }
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
