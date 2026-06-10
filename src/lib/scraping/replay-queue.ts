/**
 * Rastreabilidade: CL-050, TASK-6 ST002
 * Replay queue: captura falhas de scraping e reprocessa com backoff exponencial.
 * Após 3 tentativas: permanent_failure + AlertLog severity=medium.
 */
import { prisma } from '@/lib/prisma'
import { createAlertIfAbsent } from '@/lib/services/alert.service'

const MAX_RETRIES = 3
const BACKOFF_MS = [60_000, 300_000, 1_800_000] as const

export interface ReplayResult {
  replayed: number
  permanentFailures: number
}

/**
 * Reenfileira jobs de scraping falhados (type='rescraping.batch' com status FAILED/DEAD_LETTER).
 * Aplica backoff exponencial por retryCount.
 */
export async function processReplayQueue(): Promise<ReplayResult> {
  const failedJobs = await prisma.workerJob.findMany({
    where: {
      type: 'rescraping.batch',
      status: { in: ['FAILED', 'DEAD_LETTER'] },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  let replayed = 0
  let permanentFailures = 0

  for (const job of failedJobs) {
    if (job.retryCount >= MAX_RETRIES) {
      if (job.status !== 'DEAD_LETTER') {
        await prisma.workerJob.update({
          where: { id: job.id },
          data: { status: 'DEAD_LETTER' },
        })
      }

      const batchId = (job.payload as { batchId?: string } | null)?.batchId
      await createAlertIfAbsent({
        type: `scraping.permanent_failure:${batchId ?? job.id}`,
        severity: 'medium',
        message: `Re-scraping permanentemente falhou após ${MAX_RETRIES} tentativas. batchId=${batchId ?? 'unknown'} jobId=${job.id}`,
      })
      permanentFailures++
      continue
    }

    const delayMs = BACKOFF_MS[job.retryCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1]
    const timeSinceFail = Date.now() - job.updatedAt.getTime()

    if (timeSinceFail < delayMs) {
      continue
    }

    await prisma.workerJob.update({
      where: { id: job.id },
      data: { status: 'PENDING', retryCount: job.retryCount + 1 },
    })
    replayed++
  }

  return { replayed, permanentFailures }
}
