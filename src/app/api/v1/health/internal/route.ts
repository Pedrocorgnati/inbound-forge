/**
 * GET /api/v1/health/internal — Nível 3: health check interno
 * Rastreabilidade: INT-044, INT-045, TASK-4/ST002
 *
 * Auth: header x-internal-secret vs INTERNAL_HEALTH_SECRET
 * Uso: Railway health check + monitoring interno
 * Retorna métricas extras: cache stats, queue depths, memória
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis, QUEUE_KEYS } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function unauthorized(): NextResponse {
  return NextResponse.json(
    { code: 'AUTH_001', message: 'Autenticação necessária' },
    { status: 401 }
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verificar secret interno
  const secret = request.headers.get('x-internal-secret')
  const expectedSecret = process.env.INTERNAL_HEALTH_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return unauthorized()
  }

  try {
    const [
      dbLatency,
      redisLatency,
      queueDepths,
      workerHealths,
      recentAlerts,
      memUsage,
    ] = await Promise.all([
      // DB latência
      (async () => {
        const start = performance.now()
        try {
          await prisma.$queryRaw`SELECT 1`
          return { status: 'ok' as const, latencyMs: Math.round(performance.now() - start) }
        } catch {
          return { status: 'error' as const, latencyMs: -1 }
        }
      })(),

      // Redis latência
      (async () => {
        const start = performance.now()
        try {
          await redis.ping()
          return { status: 'ok' as const, latencyMs: Math.round(performance.now() - start) }
        } catch {
          return { status: 'error' as const, latencyMs: -1 }
        }
      })(),

      // Queue depths
      (async () => {
        try {
          const [scraping, image, video, publishing] = await Promise.all([
            redis.llen(QUEUE_KEYS.scraping),
            redis.llen(QUEUE_KEYS.image),
            redis.llen(QUEUE_KEYS.video),
            redis.llen(QUEUE_KEYS.publishing),
          ])
          return { scraping, image, video, publishing }
        } catch {
          return { scraping: -1, image: -1, video: -1, publishing: -1 }
        }
      })(),

      // Workers
      prisma.workerHealth.findMany().catch(() => []),

      // Alertas recentes (últimas 24h)
      prisma.alertLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          resolved: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { type: true, severity: true, message: true, createdAt: true },
      }).catch(() => []),

      // Memória do processo
      Promise.resolve(process.memoryUsage()),
    ])

    const overallOk = dbLatency.status === 'ok' && redisLatency.status === 'ok'

    return NextResponse.json(
      {
        status: overallOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? 'unknown',
        services: {
          database: dbLatency,
          redis: redisLatency,
        },
        queues: queueDepths,
        workers: workerHealths.map((w) => ({
          type: w.type,
          status: w.status,
          lastHeartbeat: w.lastHeartbeat.toISOString(),
          errorMessage: w.errorMessage,
        })),
        alerts: {
          unresolved24h: recentAlerts.length,
          recent: recentAlerts,
        },
        memory: {
          heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memUsage.rss / 1024 / 1024),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[health/internal] Error:', err)
    return NextResponse.json(
      { code: 'SYS_001', message: 'Erro interno no health check' },
      { status: 500 }
    )
  }
}
