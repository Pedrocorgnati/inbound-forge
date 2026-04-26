// Video Worker: Retry + Dead-Letter Queue

import type { PrismaClient } from '@prisma/client'
import { VIDEO_WORKER_CONFIG, REDIS_VIDEO_QUEUE_KEY, REDIS_VIDEO_DEAD_LETTER_KEY, VIDEO_RETRY_BACKOFF_MS } from './constants'

let _enqueue: ((jobId: string) => Promise<void>) | null = null

export function setEnqueueFn(fn: (jobId: string) => Promise<void>): void {
  _enqueue = fn
}

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

  await db.videoJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', retryCount: newRetryCount },
  })

  log({ event: 'job_retry', jobId, retryCount: newRetryCount, nextRetryAt: new Date(Date.now() + delayMs).toISOString(), error: String(error), timestamp: new Date().toISOString() })

  setTimeout(async () => {
    if (_enqueue) {
      await _enqueue(jobId)
    } else {
      try {
        const { getRedisClient } = await import('./redis-client')
        const redis = getRedisClient(process.env as never)
        await redis.rpush(REDIS_VIDEO_QUEUE_KEY, JSON.stringify({ jobId }))
      } catch (err) {
        log({ event: 'retry_enqueue_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
      }
    }
  }, delayMs)
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
