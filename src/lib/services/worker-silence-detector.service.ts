/**
 * Worker Silence Detector — Inbound Forge (TASK-3 ST002)
 *
 * Detecta workers silenciosos (sem heartbeat por > SILENCE_THRESHOLD_MIN minutos)
 * e gerencia ciclo de vida de `worker_alerts`.
 */
import { prisma } from '@/lib/prisma'

export const SILENCE_THRESHOLD_MIN = 5
const EMAIL_RATE_LIMIT_MIN = 60
const WORKER_TYPES = ['SCRAPING', 'IMAGE', 'PUBLISHING'] as const

type WorkerType = typeof WORKER_TYPES[number]

export interface DetectorResult {
  opened: Array<{ workerType: WorkerType; lastHeartbeat: Date; silentMinutes: number }>
  resolved: Array<{ workerType: WorkerType }>
  skipped: Array<{ workerType: WorkerType; reason: string }>
}

export async function check(now: Date = new Date()): Promise<DetectorResult> {
  const result: DetectorResult = { opened: [], resolved: [], skipped: [] }
  const threshold = new Date(now.getTime() - SILENCE_THRESHOLD_MIN * 60_000)
  const rateLimitCutoff = new Date(now.getTime() - EMAIL_RATE_LIMIT_MIN * 60_000)

  for (const workerType of WORKER_TYPES) {
    const health = await prisma.workerHealth.findUnique({ where: { type: workerType } })
    const openAlert = await prisma.workerAlert.findFirst({
      where: { workerType, resolvedAt: null },
      orderBy: { detectedAt: 'desc' },
    })

    const lastHeartbeat = health?.lastHeartbeat ?? null
    const isSilent = !lastHeartbeat || lastHeartbeat < threshold

    if (isSilent) {
      if (openAlert) {
        const recentEmail = openAlert.detectedAt > rateLimitCutoff && openAlert.emailSent
        if (recentEmail) {
          result.skipped.push({ workerType, reason: 'rate-limited' })
        } else {
          result.skipped.push({ workerType, reason: 'already-open' })
        }
        continue
      }

      const silentMinutes = lastHeartbeat
        ? Math.round((now.getTime() - lastHeartbeat.getTime()) / 60_000)
        : 999

      await prisma.workerAlert.create({
        data: {
          workerType,
          reason: 'silent',
          detectedAt: now,
          emailSent: false,
          metadata: { lastHeartbeat: lastHeartbeat?.toISOString() ?? null, silentMinutes },
        },
      })

      result.opened.push({
        workerType,
        lastHeartbeat: lastHeartbeat ?? new Date(0),
        silentMinutes,
      })
    } else if (openAlert) {
      await prisma.workerAlert.update({
        where: { id: openAlert.id },
        data: { resolvedAt: now },
      })
      result.resolved.push({ workerType })
    }
  }

  return result
}

export async function markEmailSent(workerType: WorkerType): Promise<void> {
  const openAlert = await prisma.workerAlert.findFirst({
    where: { workerType, resolvedAt: null, emailSent: false },
    orderBy: { detectedAt: 'desc' },
  })
  if (openAlert) {
    await prisma.workerAlert.update({
      where: { id: openAlert.id },
      data: { emailSent: true },
    })
  }
}
