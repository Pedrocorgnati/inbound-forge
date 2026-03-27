// module-9: Retry + Dead-Letter Queue
// Rastreabilidade: TASK-1 ST003, INT-059, INT-083, FEAT-creative-generation-003

import type { PrismaClient } from '@prisma/client'
import { IMAGE_WORKER_CONFIG, REDIS_QUEUE_KEY, REDIS_DEAD_LETTER_KEY, RETRY_BACKOFF_MS } from './constants'

// Lazy-loaded redis client to avoid circular deps
let _enqueue: ((jobId: string) => Promise<void>) | null = null

export function setEnqueueFn(fn: (jobId: string) => Promise<void>): void {
  _enqueue = fn
}

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

  // Re-enqueue with backoff
  const delayMs = RETRY_BACKOFF_MS[newRetryCount - 1] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]

  await db.imageJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', retryCount: newRetryCount },
  })

  log({ event: 'job_retry', jobId, retryCount: newRetryCount, nextRetryAt: new Date(Date.now() + delayMs).toISOString(), error: String(error), timestamp: new Date().toISOString() })

  setTimeout(async () => {
    if (_enqueue) {
      await _enqueue(jobId)
    } else {
      // Fallback: direct Redis rpush
      try {
        const { getRedisClient } = await import('./redis-client')
        const redis = getRedisClient(process.env as never)
        await redis.rpush(REDIS_QUEUE_KEY, JSON.stringify({ jobId }))
      } catch (err) {
        log({ event: 'retry_enqueue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
      }
    }
  }, delayMs)
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
