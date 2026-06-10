// module-9: Reaper — recupera jobs presos em PROCESSING (WK-WRK-03)
// Rastreabilidade: WK-WRK-03. Espelha o contrato de retry/dead-letter de retry.ts.
//
// Quando o worker morre (crash, SIGKILL, deploy) com um job em PROCESSING, o job
// fica orfao: nunca completa, nunca volta para a fila. O reaper varre periodicamente
// jobs em PROCESSING cujo updatedAt e mais velho que staleProcessingMs e os recoloca
// na fila (ou os manda para dead-letter quando estouram deadLetterAfter).
//
// staleProcessingMs (15min) e muito maior que o timeout de job (60s), entao um job
// legitimamente em execucao nunca e reapado.

import type { Redis } from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'
import { IMAGE_WORKER_CONFIG, REDIS_QUEUE_KEY, REDIS_DEAD_LETTER_KEY } from './constants'

export async function reapStalledJobs(db: PrismaClient, redis: Redis): Promise<number> {
  const threshold = new Date(Date.now() - IMAGE_WORKER_CONFIG.staleProcessingMs)

  const stalled = await db.imageJob.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: threshold } },
    select: { id: true, retryCount: true },
  })

  for (const job of stalled) {
    const newRetryCount = (job.retryCount ?? 0) + 1
    const deadLetter = newRetryCount >= IMAGE_WORKER_CONFIG.deadLetterAfter

    if (deadLetter) {
      await db.imageJob.update({
        where: { id: job.id },
        data: {
          status: 'DEAD_LETTER',
          retryCount: newRetryCount,
          errorMessage: 'reaper: job preso em PROCESSING (worker crash)',
        },
      })
      try {
        await redis.rpush(
          REDIS_DEAD_LETTER_KEY,
          JSON.stringify({ jobId: job.id, error: 'reaped_stalled', failedAt: Date.now(), retryCount: newRetryCount }),
        )
      } catch (err) {
        // best-effort: enfileirar no dead-letter nao e critico.
        log({ event: 'reaper_deadletter_enqueue_failed', jobId: job.id, error: String(err), timestamp: new Date().toISOString() })
      }
    } else {
      await db.imageJob.update({
        where: { id: job.id },
        data: { status: 'PENDING', retryCount: newRetryCount },
      })
      try {
        await redis.rpush(REDIS_QUEUE_KEY, JSON.stringify({ jobId: job.id }))
      } catch (err) {
        // best-effort: o proximo tick do reaper nao reve este job (ja PENDING), mas
        // o sinal fica registrado para diagnostico (Zero Silencio).
        log({ event: 'reaper_requeue_failed', jobId: job.id, error: String(err), timestamp: new Date().toISOString() })
      }
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
  }, IMAGE_WORKER_CONFIG.reaperIntervalMs)
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
