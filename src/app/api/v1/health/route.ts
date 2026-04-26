import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { sendWorkerAlert } from '@/lib/services/email-alert.service'
import type { WorkerType } from '@/lib/services/email-alert.service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/v1/health — público, sem autenticação
export async function GET() {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected'
  let redisStatus: 'connected' | 'disconnected' = 'disconnected'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch {
    // DB indisponível
  }

  try {
    await redis.ping()
    redisStatus = 'connected'
  } catch {
    // Redis indisponível
  }

  // Buscar status dos workers
  // THREAT-002: nunca expor nome interno de processo, errorMessage ou id do worker
  const workerHealths = await prisma.workerHealth.findMany().catch(() => [])

  const workerScraping = workerHealths.find((w) => w.type === 'SCRAPING') ?? null
  const workerImage = workerHealths.find((w) => w.type === 'IMAGE') ?? null
  const workerPublishing = workerHealths.find((w) => w.type === 'PUBLISHING') ?? null

  const isHealthy = dbStatus === 'connected'
  const httpStatus = isHealthy ? 200 : 503

  // TASK-4 ST006: disparar email de alerta para workers em ERROR (CL-131, debounce 1h)
  const errorWorkers: Array<{ type: WorkerType; health: typeof workerScraping }> = [
    { type: 'SCRAPING', health: workerScraping },
    { type: 'IMAGE', health: workerImage },
    { type: 'PUBLISHING', health: workerPublishing },
  ]

  for (const { type, health } of errorWorkers) {
    if (health?.status === 'ERROR') {
      sendWorkerAlert({
        workerType: type,
        status: 'ERROR',
        errorMessage: health.errorMessage ?? 'Erro desconhecido',
        timestamp: new Date(),
      }).catch(() => {}) // fire-and-forget — não bloquear resposta
    }
  }

  // SEC: selecionar explicitamente apenas os campos públicos permitidos
  // Nunca spredar o objeto workerHealth completo (contém errorMessage, id interno)
  return NextResponse.json(
    {
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        database: dbStatus,
        redis: redisStatus,
        workers: {
          scraping: {
            status: workerScraping?.status ?? 'ERROR',
            lastHeartbeat: workerScraping?.lastHeartbeat ?? null,
          },
          image: {
            status: workerImage?.status ?? 'ERROR',
            lastHeartbeat: workerImage?.lastHeartbeat ?? null,
          },
          publishing: {
            status: workerPublishing?.status ?? 'ERROR',
            lastHeartbeat: workerPublishing?.lastHeartbeat ?? null,
          },
        },
        timestamp: new Date().toISOString(),
      },
    },
    { status: httpStatus, headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
