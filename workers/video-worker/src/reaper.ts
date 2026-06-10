// Video Worker: Reaper — recupera jobs presos em PROCESSING (WK-WRK-03)
// Espelho do image-worker/reaper.ts para videoJob. Ver doc la para detalhes.
//
// Quando o worker morre com um job em PROCESSING, o job fica orfao. O reaper varre
// periodicamente jobs em PROCESSING cujo updatedAt e mais velho que staleProcessingMs
// e os recoloca na fila (ou os manda para dead-letter quando estouram deadLetterAfter).

import type { Redis } from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'
import { VIDEO_WORKER_CONFIG, REDIS_VIDEO_QUEUE_KEY, REDIS_VIDEO_DEAD_LETTER_KEY } from './constants'

export async function reapStalledJobs(db: PrismaClient, redis: Redis): Promise<number> {
  const threshold = new Date(Date.now() - VIDEO_WORKER_CONFIG.staleProcessingMs)

  const stalled = await db.videoJob.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: threshold } },
    select: { id: true, retryCount: true },
  })

  for (const job of stalled) {
    const newRetryCount = (job.retryCount ?? 0) + 1
    const deadLetter = newRetryCount >= VIDEO_WORKER_CONFIG.deadLetterAfter

    if (deadLetter) {
      await db.videoJob.update({
        where: { id: job.id },
        data: {
          status: 'DEAD_LETTER',
          retryCount: newRetryCount,
          errorMessage: 'reaper: job preso em PROCESSING (worker crash)',
        },
      })
      try {
        await redis.rpush(
          REDIS_VIDEO_DEAD_LETTER_KEY,
          JSON.stringify({ jobId: job.id, error: 'reaped_stalled', failedAt: Date.now(), retryCount: newRetryCount }),
        )
      } catch (err) {
        log({ event: 'reaper_deadletter_enqueue_failed', jobId: job.id, error: String(err), timestamp: new Date().toISOString() })
      }
    } else {
      // rpush ANTES do update (ver image-worker): rpush-fail mantem o job PROCESSING
      // para o proximo tick, em vez de orfana-lo em PENDING sem entrada na fila.
      try {
        await redis.rpush(REDIS_VIDEO_QUEUE_KEY, JSON.stringify({ jobId: job.id }))
      } catch (err) {
        log({ event: 'reaper_requeue_failed', jobId: job.id, error: String(err), timestamp: new Date().toISOString() })
        continue
      }
      await db.videoJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', retryCount: newRetryCount },
      })
    }

    log({ event: 'job_reaped', jobId: job.id, retryCount: newRetryCount, deadLetter, timestamp: new Date().toISOString() })
  }

  return stalled.length
}

export function startReaper(db: PrismaClient, redis: Redis): NodeJS.Timeout {
  return setInterval(() => {
    reapStalledJobs(db, redis).catch((err) =>
      log({ event: 'reaper_error', error: String(err), timestamp: new Date().toISOString() }),
    )
  }, VIDEO_WORKER_CONFIG.reaperIntervalMs)
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
