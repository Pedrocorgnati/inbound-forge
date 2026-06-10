/**
 * Rastreabilidade: CL-046, TASK-6 ST001 (WK-WRK-06)
 * Worker (cron): enfileira UM batch de re-scraping de todas as Sources ativas
 * (nao anti-bot-blocked) na fila Redis 'scraping:<batchId>', espelhando o producer
 * canonico do app (POST /api/workers/scraping/trigger). O consumer real e o
 * workers/scraping-worker.
 *
 * O design anterior iterava Themes com cooldown sobre theme.updatedAt — mas Theme
 * nao tem relacao com Source e a fila do scraping e source-based; o enqueue era um
 * no-op (so logava). Agora produz o mesmo payload que o trigger manual.
 *
 * SEC-008: logs apenas com batchId/sourceCount/correlationId, nunca URLs.
 */
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { REDIS_KEYS } from '@/constants/redis-keys'
import { trackJob } from '@/lib/workers/track-job'
import type { ScrapingJob } from '@/lib/types/scraping.types'

export async function run(): Promise<{ enqueued: number; skipped: number }> {
  const correlationId = randomUUID()
  console.info(`[rescraping.worker] start | correlationId=${correlationId}`)

  // Mesmo filtro do trigger route (TASK-3 CL-030: bypass anti-bot-blocked).
  const sources = await prisma.source.findMany({
    where: { isActive: true, antiBotBlocked: false },
    select: { id: true },
  })

  if (sources.length === 0) {
    console.info(`[rescraping.worker] done | correlationId=${correlationId} enqueued=0 skipped=0`)
    return { enqueued: 0, skipped: 0 }
  }

  const batchId = randomUUID()
  const job: ScrapingJob = {
    batchId,
    sourceIds: sources.map((s) => s.id),
    triggeredBy: 'cron',
    createdAt: new Date().toISOString(),
  }

  // trackJob registra o lifecycle (PENDING -> RUNNING -> COMPLETED|FAILED) em WorkerJob;
  // o enqueue real na fila Redis acontece dentro do callback.
  await trackJob(
    { type: 'rescraping.batch', payload: { batchId, sourceCount: sources.length, correlationId } },
    async () => {
      await redis.lpush(REDIS_KEYS.SCRAPING_BATCH(batchId), JSON.stringify(job))
    },
  )

  console.info(
    `[rescraping.worker] done | correlationId=${correlationId} enqueued=${sources.length} skipped=0`,
  )
  return { enqueued: sources.length, skipped: 0 }
}
