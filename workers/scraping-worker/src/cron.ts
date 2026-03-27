/**
 * Cron Scheduler — Scraping Worker
 * TASK-1 ST004 / module-6-scraping-worker
 *
 * Agenda execução automática de batches de scraping via node-cron.
 * Default: "0 2 * * *" (2AM UTC diário) — configurável via SCRAPING_CRON_SCHEDULE.
 * SEC-008: logs sem URLs ou rawText.
 */
import cron from 'node-cron'
import { randomUUID } from 'crypto'
import { enqueueBatch } from './queue'
import { getPrisma } from './db'
import { DEFAULT_CRON_SCHEDULE } from './constants'

let cronTask: cron.ScheduledTask | null = null

export function startCron(): void {
  if (cronTask) return

  const schedule = DEFAULT_CRON_SCHEDULE
  if (!cron.validate(schedule)) {
    console.error(`[Cron] Invalid cron schedule: "${schedule}" — cron not started`)
    return
  }

  cronTask = cron.schedule(schedule, () => void runBatch(), {
    timezone: 'UTC',
  })

  console.info(`[Cron] Scheduled | schedule="${schedule}" | timezone=UTC`)
}

export async function runBatch(sourceIds: string[] = []): Promise<{ batchId: string; queued: number }> {
  const batchId = randomUUID()
  const prisma = getPrisma()

  let activeSources: { id: string }[]

  try {
    activeSources = await prisma.source.findMany({
      where: sourceIds.length > 0 ? { id: { in: sourceIds }, isActive: true } : { isActive: true },
      select: { id: true },
    })
  } catch (err) {
    console.error(`[Cron] DB offline — batch aborted | batchId=${batchId}`, err instanceof Error ? err.message : 'unknown')
    throw new Error('DB offline — cron skipped, cache unavailable')
  }

  if (activeSources.length === 0) {
    console.warn(`[Cron] No active sources found | batchId=${batchId}`)
    return { batchId, queued: 0 }
  }

  const result = await enqueueBatch({
    batchId,
    sourceIds: activeSources.map((s) => s.id),
    triggeredBy: 'cron',
    createdAt: new Date().toISOString(),
  })

  console.info(`[Cron] Batch triggered | batchId=${batchId} | sources=${result.queued}`)
  return result
}

export function stopCron(): void {
  if (cronTask) {
    cronTask.stop()
    cronTask = null
    console.info('[Cron] Stopped')
  }
}
