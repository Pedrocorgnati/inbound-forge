/**
 * ScrapingHealthService — TASK-2/ST001 (gap CL-031).
 * Expoe `isScrapingDegraded()` para que o motor de temas decida rodar em modo "internal-only"
 * quando o worker de scraping esta unhealthy por mais que SCRAPING_DEGRADED_THRESHOLD_HOURS.
 */
import { prisma } from '@/lib/prisma'

const DEFAULT_THRESHOLD_HOURS = 24

export interface ScrapingHealthSnapshot {
  degraded: boolean
  status: string
  lastHealthyAt: Date | null
  thresholdHours: number
  reason?: string
}

export async function getScrapingHealth(): Promise<ScrapingHealthSnapshot> {
  const thresholdHours = Number(process.env.SCRAPING_DEGRADED_THRESHOLD_HOURS ?? DEFAULT_THRESHOLD_HOURS)
  const worker = await prisma.workerHealth.findFirst({ where: { type: 'SCRAPING' } })

  if (!worker) {
    return {
      degraded: true,
      status: 'UNKNOWN',
      lastHealthyAt: null,
      thresholdHours,
      reason: 'Worker record not found',
    }
  }

  const isHealthyState = worker.status === 'IDLE' || worker.status === 'ACTIVE'
  const lastHealthyAt = (worker as unknown as { lastHealthyAt?: Date | null }).lastHealthyAt ?? worker.updatedAt
  const hoursSinceHealthy = lastHealthyAt
    ? (Date.now() - new Date(lastHealthyAt).getTime()) / 3_600_000
    : Number.POSITIVE_INFINITY

  const degraded = !isHealthyState && hoursSinceHealthy >= thresholdHours

  return {
    degraded,
    status: worker.status,
    lastHealthyAt: lastHealthyAt ?? null,
    thresholdHours,
    reason: degraded ? `Scraping ${worker.status} ha ${hoursSinceHealthy.toFixed(1)}h` : undefined,
  }
}

export async function isScrapingDegraded(): Promise<boolean> {
  const snapshot = await getScrapingHealth().catch(() => null)
  return snapshot?.degraded ?? false
}
