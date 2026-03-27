import { NextRequest, NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

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

// GET /api/v1/api-usage/totals — totais de custo por período
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const rawPeriod = searchParams.get('period') ?? 'month'
  const period: Period = ['day', 'week', 'month'].includes(rawPeriod)
    ? (rawPeriod as Period)
    : 'month'

  const operatorId = user!.id
  const cacheKey = `api-usage:totals:${operatorId}:${period}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(JSON.parse(cached as string), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const startDate = getStartDate(period)

    // SCHEMA NOTE: no operatorId in ApiUsageLog — global aggregation
    const rows = await prisma.apiUsageLog.groupBy({
      by: ['service'],
      _sum: { cost: true },
      where: { recordedAt: { gte: startDate } },
    })

    const byService: Record<string, number> = {}
    let totalCostUSD = 0

    for (const row of rows) {
      const cost = row._sum.cost ?? 0
      byService[row.service] = Math.round(cost * 100) / 100
      totalCostUSD += cost
    }

    const result = {
      totalCostUSD: Math.round(totalCostUSD * 100) / 100,
      byService,
      period,
      resetAt: getResetAt(),
    }

    await redis.set(cacheKey, JSON.stringify(result), { ex: 300 })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return internalError()
  }
}
