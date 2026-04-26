/**
 * GET /api/health — Health check endpoint (público, sem autenticação)
 *
 * Gerado por: /rollout-strategy-create setup
 * Atualizado por: auto-flow execute (module-1/TASK-3/ST003)
 * Intake-Review TASK-9 ST002 (CL-OP-005): timeouts + bypass de audit para monitor externo.
 *
 * SEGURANÇA (THREAT-002): Retorna informações mínimas de saúde.
 * Não expõe stack traces, mensagens de erro internas ou topologia da infra.
 *
 * BDD (SYS_001 / SYS_002):
 * - 200 quando DB + Redis estão online
 * - 503 quando algum serviço falha, sem expor detalhes do erro
 *
 * Usado por:
 * - Canary deploy script (canary-deploy.sh)
 * - Railway healthcheck (worker containers)
 * - Vercel monitoring
 * - BetterStack Uptime HTTP monitor (TASK-9)
 * - module-15: health panel (via /api/health/detailed — autenticado)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CHECK_TIMEOUT_MS = 5000

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function GET(request: NextRequest) {
  // Intake-Review TASK-9 ST002: detectar ping do monitor externo.
  // Futuro: se AuditLog for adicionado neste endpoint, usar isMonitorPing
  // para bypass. Hoje o endpoint nao audita, mas mantemos o marcador
  // explicito para nao regredirmos.
  const ua = request.headers.get('user-agent') ?? ''
  const monitorHeader = request.headers.get('x-monitor') ?? ''
  const isMonitorPing =
    monitorHeader.toLowerCase() === 'betterstack' ||
    /better\s*uptime/i.test(ua) ||
    /betterstack/i.test(ua)

  let db = false
  let redisOk = false

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS)
    db = true
  } catch {
    console.error('[SYS_001] Health check: database unreachable or timed out')
  }

  try {
    const pong = await withTimeout(redis.ping(), CHECK_TIMEOUT_MS)
    redisOk = pong === 'PONG'
  } catch {
    console.error('[SYS_002] Health check: Redis unreachable or timed out')
  }

  const status = db && redisOk ? 'ok' : 'degraded'
  const httpStatus = status === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status,
      db,
      redis: redisOk,
      version: process.env.npm_package_version ?? '0.0.0',
      environment: process.env.NODE_ENV ?? 'production',
      timestamp: new Date().toISOString(),
    },
    {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        ...(isMonitorPing ? { 'X-Monitor-Ack': '1' } : {}),
      },
    }
  )
}
