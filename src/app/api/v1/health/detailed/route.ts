import { NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { WorkerStatus, WorkerType } from '@/types/enums'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function calculateWorkerStatus(
  lastHeartbeat: Date,
  workerType: WorkerType
): WorkerStatus {
  const diffMs = Date.now() - lastHeartbeat.getTime()
  const diffMin = diffMs / 60000

  // WorkerType.PUBLISHING has tighter thresholds
  if (workerType === WorkerType.PUBLISHING) {
    if (diffMin < 2) return WorkerStatus.ACTIVE
    if (diffMin < 5) return WorkerStatus.IDLE
    return WorkerStatus.ERROR
  }
  // SCRAPING, IMAGE: standard thresholds
  if (diffMin < 5) return WorkerStatus.ACTIVE
  if (diffMin < 15) return WorkerStatus.IDLE
  return WorkerStatus.ERROR
}

// GET /api/v1/health/detailed — autenticado — resposta < 500ms
export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [dbCheck, redisCheck, workers, postsCount, conversionsCount] =
      await Promise.all([
        (async () => {
          const start = performance.now()
          try {
            await prisma.$queryRaw`SELECT 1`
            return { status: 'ok' as const, latencyMs: Math.round(performance.now() - start) }
          } catch {
            return { status: 'error' as const, latencyMs: -1 }
          }
        })(),
        (async () => {
          const start = performance.now()
          try {
            await redis.ping()
            return { status: 'ok' as const, latencyMs: Math.round(performance.now() - start) }
          } catch {
            return { status: 'error' as const, latencyMs: -1 }
          }
        })(),
        prisma.workerHealth.findMany(),
        prisma.contentPiece.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
        prisma.conversionEvent.count().catch(() => 0),
      ])

    const scrapingWorker = workers.find((w) => w.type === WorkerType.SCRAPING)
    const imageWorker = workers.find((w) => w.type === WorkerType.IMAGE)
    const publishWorker = workers.find((w) => w.type === WorkerType.PUBLISHING)

    const workersStatus = {
      scraping: scrapingWorker
        ? {
            status: calculateWorkerStatus(scrapingWorker.lastHeartbeat, WorkerType.SCRAPING),
            lastHeartbeat: scrapingWorker.lastHeartbeat.toISOString(),
          }
        : { status: WorkerStatus.ERROR, lastHeartbeat: new Date(0).toISOString() },
      image: imageWorker
        ? {
            status: calculateWorkerStatus(imageWorker.lastHeartbeat, WorkerType.IMAGE),
            lastHeartbeat: imageWorker.lastHeartbeat.toISOString(),
          }
        : { status: WorkerStatus.ERROR, lastHeartbeat: new Date(0).toISOString() },
      publish: publishWorker
        ? {
            status: calculateWorkerStatus(publishWorker.lastHeartbeat, WorkerType.PUBLISHING),
            lastHeartbeat: publishWorker.lastHeartbeat.toISOString(),
          }
        : { status: WorkerStatus.ERROR, lastHeartbeat: new Date(0).toISOString() },
    }

    const hasInfraError = dbCheck.status === 'error' || redisCheck.status === 'error'
    const hasWorkerError = Object.values(workersStatus).some(
      (w) => w.status === WorkerStatus.ERROR
    )
    const hasWorkerIdle = Object.values(workersStatus).some(
      (w) => w.status === WorkerStatus.IDLE
    )

    let overallStatus: 'ok' | 'degraded' | 'down'
    if (hasInfraError) overallStatus = 'down'
    else if (hasWorkerError || hasWorkerIdle) overallStatus = 'degraded'
    else overallStatus = 'ok'

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          database: dbCheck,
          redis: redisCheck,
          workers: workersStatus,
        },
        learnToRankThreshold: {
          enabled: postsCount >= 5 && conversionsCount >= 5,
          postsCount,
          conversionsCount,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return internalError()
  }
}
