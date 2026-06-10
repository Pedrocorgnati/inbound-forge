/**
 * GET /api/health/public — Health check sem autenticação para status pages externas.
 * CL-304 (TASK-9 ST001)
 *
 * Retorna apenas: {status, version, timestamp}
 * Sem leak de internals (host DB, schema, env names, stack traces).
 * Rate-limit 60 req/min por IP. Cache 30s.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DB_TIMEOUT_MS = 2000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

// Contador em memória (suficiente para Vercel edge-less; substitua por Redis em multi-região)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

async function dbPing(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), DB_TIMEOUT_MS)
    prisma.$queryRaw`SELECT 1`
      .then(() => { clearTimeout(timer); resolve(true) })
      .catch(() => { clearTimeout(timer); resolve(false) })
  })
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { status: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const dbOk = await dbPing()
  const status = dbOk ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    }
  )
}
