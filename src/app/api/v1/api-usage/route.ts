import { NextRequest, NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getServiceLimits } from '@/lib/cost-alert'
import type { ApiUsageData } from '@/types/health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Period = 'day' | 'week' | 'month'

function getStartDate(period: Period): Date {
  const now = new Date()
  if (period === 'day') {
    now.setHours(0, 0, 0, 0)
    return now
  }
  if (period === 'week') {
    const day = now.getDay()
    now.setDate(now.getDate() - day)
    now.setHours(0, 0, 0, 0)
    return now
  }
  // month
  now.setDate(1)
  now.setHours(0, 0, 0, 0)
  return now
}

function getResetAt(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// GET /api/v1/api-usage — consumo por serviço no período
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const rawPeriod = searchParams.get('period') ?? 'month'
  const period: Period = ['day', 'week', 'month'].includes(rawPeriod)
    ? (rawPeriod as Period)
    : 'month'

  const operatorId = user!.id
  const startDate = getStartDate(period)
  const cacheKey = `api-usage:${operatorId}:${period}:${startDate.toISOString().slice(0, 10)}`

  try {
    // Cache hit
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Aggregate by service — SCHEMA NOTE: no operatorId in ApiUsageLog; global per service
    const rows = await prisma.apiUsageLog.groupBy({
      by: ['service'],
      _sum: { value: true, cost: true },
      _count: true,
      where: { recordedAt: { gte: startDate } },
    })

    const limits = getServiceLimits()
    const resetAt = getResetAt()
    const services = ['anthropic', 'ideogram', 'flux', 'browserless', 'instagram']

    const result: ApiUsageData[] = services.map((svc) => {
      const row = rows.find((r) => r.service === svc)
      const limitTokens = limits[svc] ?? 0
      const usedTokens = row?._sum.value ?? 0
      const costUSD = row?._sum.cost ?? 0
      const percentUsed = limitTokens > 0
        ? Math.round((usedTokens / limitTokens) * 1000) / 10
        : 0

      return {
        service: svc,
        usedTokens,
        limitTokens,
        costUSD,
        resetAt,
        percentUsed,
      }
    })

    await redis.set(cacheKey, JSON.stringify(result), { ex: 300 })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return internalError()
  }
}
