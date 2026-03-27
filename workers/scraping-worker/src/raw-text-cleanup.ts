/**
 * Raw Text Cleanup Job — Scraping Worker
 * TASK-3 ST003 / COMP-006 / module-6-scraping-worker
 *
 * Nullifica rawText de ScrapedTexts com mais de 1h de vida.
 * Executado a cada 15 minutos (cron paralelo ao scraping).
 * SEC-008: log sem conteúdo dos textos.
 */
import cron from 'node-cron'
import { getPrisma } from './db'

const BATCH_LIMIT = 100
const CLEANUP_SCHEDULE = '*/15 * * * *' // A cada 15 min
const ONE_HOUR_MS = 60 * 60 * 1000

export interface CleanupResult {
  cleaned: number
  skipped?: boolean
}

let cleanupTask: cron.ScheduledTask | null = null

/**
 * Nullifica rawText de registros elegíveis (updatedAt < now - 1h e rawText != null).
 * Processa em batches de 100 para não travar o event loop.
 */
export async function cleanupRawTexts(): Promise<CleanupResult> {
  const prisma = getPrisma()
  const cutoff = new Date(Date.now() - ONE_HOUR_MS)

  // Verificar se há registros elegíveis
  const eligible = await prisma.scrapedText.count({
    where: {
      rawText: { not: null },
      updatedAt: { lt: cutoff },
    },
  })

  if (eligible === 0) {
    return { cleaned: 0, skipped: true }
  }

  let totalCleaned = 0
  let remaining = eligible

  while (remaining > 0) {
    const ids = await prisma.scrapedText.findMany({
      where: {
        rawText: { not: null },
        updatedAt: { lt: cutoff },
      },
      select: { id: true },
      take: BATCH_LIMIT,
    })

    if (ids.length === 0) break

    const updated = await prisma.scrapedText.updateMany({
      where: { id: { in: ids.map((r) => r.id) } },
      data: { rawText: null },
    })

    totalCleaned += updated.count
    remaining -= ids.length

    console.info(`[Cleanup] rawText nullified | batch=${updated.count} | total=${totalCleaned} | remaining=${Math.max(0, remaining)}`)

    // Yield para não bloquear o event loop por mais de 500ms
    await new Promise((r) => setImmediate(r))
  }

  // Log de auditoria LGPD
  if (totalCleaned > 0) {
    await prisma.alertLog.create({
      data: {
        type: 'RAW_TEXT_CLEANUP',
        severity: 'INFO',
        message: `rawText nullificado em ${totalCleaned} registros (COMP-006)`,
        resolved: true,
        resolvedAt: new Date(),
      },
    }).catch((err: unknown) => {
      console.error('[Cleanup] Failed to log AlertLog', err instanceof Error ? err.message : 'unknown')
    })
  }

  return { cleaned: totalCleaned }
}

export function startCleanupCron(): void {
  if (cleanupTask) return

  cleanupTask = cron.schedule(CLEANUP_SCHEDULE, () => {
    void cleanupRawTexts().catch((err: unknown) => {
      console.error('[Cleanup] Error in cleanup job', err instanceof Error ? err.message : 'unknown')
    })
  }, { timezone: 'UTC' })

  console.info(`[Cleanup] Cleanup cron started | schedule="${CLEANUP_SCHEDULE}"`)
}

export function stopCleanupCron(): void {
  if (cleanupTask) {
    cleanupTask.stop()
    cleanupTask = null
    console.info('[Cleanup] Cleanup cron stopped')
  }
}
