/**
 * GET /api/health — Health check endpoint (público, sem autenticação)
 *
 * Gerado por: /rollout-strategy-create setup
 * Atualizado por: auto-flow execute (module-1/TASK-3/ST003)
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
 * - module-15: health panel (via /api/health/detailed — autenticado)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  let db = false
  let redisOk = false

  // Verificar conectividade DB (SYS_001)
  try {
    await prisma.$queryRaw`SELECT 1`
    db = true
  } catch {
    // Falha logada internamente — não exposta na resposta (SEC-001)
    console.error('[SYS_001] Health check: database unreachable')
  }

  // Verificar conectividade Redis (SYS_002)
  try {
    const pong = await redis.ping()
    redisOk = pong === 'PONG'
  } catch {
    // Falha logada internamente — não exposta na resposta (SEC-001)
    console.error('[SYS_002] Health check: Redis unreachable')
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
      },
    }
  )
}
