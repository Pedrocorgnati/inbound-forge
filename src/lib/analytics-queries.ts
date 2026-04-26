// Analytics Queries — module-14
// Queries de analytics com cache Redis de 5 minutos
// INT-027, INT-040 | SEC-008: sem PII

import { prisma } from '@/lib/prisma'
import { ConversionType } from '@/types/enums'
import { getCachedAnalytics } from '@/lib/analytics-cache'
import { ANALYTICS_CACHE_TTL } from '@/constants/analytics-constants'
import type {
  AnalyticsPeriod,
  FunnelMetrics,
  FunnelStageData,
  ThemeRanking,
  ChannelPerformance,
  ReconciliationStats,
} from '@/types/analytics'

const VALID_PERIODS: AnalyticsPeriod[] = ['7d', '30d', '90d']

function periodToDays(period: AnalyticsPeriod): number {
  return parseInt(period.replace('d', ''), 10)
}

function validatePeriod(period: unknown): AnalyticsPeriod {
  if (!VALID_PERIODS.includes(period as AnalyticsPeriod)) {
    throw new Error(`ANALYTICS_020: Período inválido. Use: ${VALID_PERIODS.join(', ')}`)
  }
  return period as AnalyticsPeriod
}

function periodStartDate(period: AnalyticsPeriod): Date {
  const days = periodToDays(period)
  const from = new Date()
  from.setDate(from.getDate() - days)
  from.setHours(0, 0, 0, 0)
  return from
}

/**
 * Métricas do funil de conversão por período.
 * Funil: Publicações → Cliques → Conversas → Reuniões → Propostas
 * SEC-008: sem PII — apenas contagens agregadas
 */
export async function getFunnelMetrics(period: unknown, userId: string): Promise<FunnelMetrics> {
  const validPeriod = validatePeriod(period)
  const from = periodStartDate(validPeriod)
  const cacheKey = `analytics:funnel:${validPeriod}:${userId}`

  return getCachedAnalytics(cacheKey, ANALYTICS_CACHE_TTL.funnel, async () => {
    const [publications, utmLinkClicks, conversations, meetings, proposals] = await Promise.all([
      // Publicações no período
      prisma.post.count({
        where: { publishedAt: { gte: from, not: null } },
      }),
      // Cliques (soma de UTMLink.clicks de posts publicados no período)
      prisma.uTMLink.aggregate({
        _sum: { clicks: true },
        where: { post: { publishedAt: { gte: from } } },
      }),
      // Conversas (CONVERSATION)
      prisma.conversionEvent.count({
        where: { type: ConversionType.CONVERSATION, occurredAt: { gte: from } },
      }),
      // Reuniões (MEETING)
      prisma.conversionEvent.count({
        where: { type: ConversionType.MEETING, occurredAt: { gte: from } },
      }),
      // Propostas (PROPOSAL)
      prisma.conversionEvent.count({
        where: { type: ConversionType.PROPOSAL, occurredAt: { gte: from } },
      }),
    ])

    const clicks = utmLinkClicks._sum.clicks ?? 0

    const counts = [publications, clicks, conversations, meetings, proposals]
    const labels = ['Publicações', 'Cliques', 'Conversas', 'Reuniões', 'Propostas']

    const stages: FunnelStageData[] = counts.map((count, i) => {
      const prev = i === 0 ? count : counts[i - 1]
      const conversionRate = prev > 0 ? Math.round((count / prev) * 100) : 0
      return { label: labels[i], count, conversionRate }
    })

    return { period: validPeriod, stages }
  })
}

/**
 * Ranking de temas por conversionScore.
 * Inclui trend (últimos 7 dias) e channelBreakdown.
 * SEC-008: sem PII — apenas IDs e contagens
 */
export async function getThemeRanking(
  userId: string,
  sortBy: 'conversionScore' | 'leadsCount' = 'conversionScore',
  page = 1,
  limit = 20,
  period: unknown = '30d',
  sortDir: 'asc' | 'desc' = 'desc'
): Promise<{ items: ThemeRanking[]; total: number }> {
  const validPeriod = validatePeriod(period)
  const from = periodStartDate(validPeriod)
  const cacheKey = `analytics:themes:${validPeriod}:${sortBy}:${sortDir}:${page}:${limit}:${userId}`

  return getCachedAnalytics(cacheKey, ANALYTICS_CACHE_TTL.themeRanking, async () => {
    const [themes, total] = await Promise.all([
      prisma.theme.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: sortBy === 'conversionScore'
          ? { conversionScore: sortDir }
          : { firstTouchLeads: { _count: sortDir } },
        select: {
          id: true,
          title: true,
          conversionScore: true,
          firstTouchLeads: {
            where: { createdAt: { gte: from } },
            select: {
              id: true,
              channel: true,
              conversionEvents: { select: { id: true } },
            },
          },
        },
      }),
      prisma.theme.count(),
    ])

    const items: ThemeRanking[] = themes.map((theme) => {
      const leadsCount = theme.firstTouchLeads.length
      const conversionsCount = theme.firstTouchLeads.reduce(
        (acc, lead) => acc + lead.conversionEvents.length, 0
      )

      // Channel breakdown
      const channelMap = new Map<string, number>()
      for (const lead of theme.firstTouchLeads) {
        if (lead.channel) {
          channelMap.set(lead.channel, (channelMap.get(lead.channel) ?? 0) + 1)
        }
      }
      const channelBreakdown = Array.from(channelMap.entries()).map(([channel, count]) => ({
        channel: channel as ThemeRanking['channelBreakdown'][number]['channel'],
        count,
      }))

      return {
        themeId: theme.id,
        themeName: theme.title,
        conversionScore: theme.conversionScore,
        leadsCount,
        conversionsCount,
        trend: [] as number[], // populated below
        channelBreakdown,
      }
    })

    // Trend: weekly conversion counts for last 7 weeks per theme
    const themeIds = items.map((i) => i.themeId)
    if (themeIds.length > 0) {
      const sevenWeeksAgo = new Date()
      sevenWeeksAgo.setDate(sevenWeeksAgo.getDate() - 49)

      const weeklyEvents = await prisma.conversionEvent.findMany({
        where: {
          lead: { firstTouchThemeId: { in: themeIds } },
          occurredAt: { gte: sevenWeeksAgo },
        },
        select: {
          occurredAt: true,
          lead: { select: { firstTouchThemeId: true } },
        },
      })

      // Build weekly buckets per theme
      const now = Date.now()
      for (const item of items) {
        const weeks = Array(7).fill(0)
        for (const evt of weeklyEvents) {
          if (evt.lead?.firstTouchThemeId === item.themeId) {
            const weeksAgo = Math.floor((now - evt.occurredAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
            const idx = 6 - Math.min(weeksAgo, 6) // 0=oldest, 6=current
            weeks[idx]++
          }
        }
        item.trend = weeks
      }
    }

    return { items, total }
  })
}

/**
 * Performance por canal de distribuição.
 * SEC-008: sem PII — apenas contagens agregadas por canal
 */
export async function getChannelPerformance(
  period: unknown,
  userId: string
): Promise<ChannelPerformance[]> {
  const validPeriod = validatePeriod(period)
  const from = periodStartDate(validPeriod)
  const cacheKey = `analytics:channel:${validPeriod}:${userId}`

  return getCachedAnalytics(cacheKey, ANALYTICS_CACHE_TTL.channelPerformance, async () => {
    const leads = await prisma.lead.groupBy({
      by: ['channel'],
      where: { channel: { not: null }, createdAt: { gte: from } },
      _count: { id: true },
    })

    const results: ChannelPerformance[] = []

    for (const group of leads) {
      if (!group.channel) continue
      const leadsCount = group._count.id
      const conversionsCount = await prisma.conversionEvent.count({
        where: {
          lead: { channel: group.channel, createdAt: { gte: from } },
          occurredAt: { gte: from },
        },
      })
      const conversionRate = leadsCount > 0
        ? Math.round((conversionsCount / leadsCount) * 100)
        : 0

      results.push({
        channel: group.channel,
        leadsCount,
        conversionsCount,
        conversionRate,
      })
    }

    return results
  })
}

/**
 * Estatísticas de reconciliação.
 * SEC-008: sem PII — apenas contagens
 */
export async function getReconciliationStats(userId: string): Promise<ReconciliationStats> {
  const cacheKey = `analytics:reconciliation:stats:${userId}`

  return getCachedAnalytics(cacheKey, ANALYTICS_CACHE_TTL.reconciliation, async () => {
    const [clicksWithoutConversion, conversionsWithoutPost, pendingResolution] = await Promise.all([
      prisma.reconciliationItem.count({
        where: { type: 'click_without_conversion', resolved: false },
      }),
      prisma.reconciliationItem.count({
        where: { type: 'conversion_without_post', resolved: false },
      }),
      prisma.reconciliationItem.count({ where: { resolved: false } }),
    ])

    return { clicksWithoutConversion, conversionsWithoutPost, pendingResolution }
  })
}

// TASK-13 ST004 (CL-139): tendencia de ASoV (Active Share of Voice) por dia
export interface AsovTrendPoint {
  date: string // ISO date (YYYY-MM-DD)
  mentions: number
  total: number
  rate: number // mentions / total (0..1)
}

export async function getAsovTrend(days = 30): Promise<AsovTrendPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await prisma.asovSnapshot.findMany({
    where: { probeDate: { gte: since } },
    select: { probeDate: true, mentioned: true },
  })
  const buckets = new Map<string, { mentions: number; total: number }>()
  for (const row of rows) {
    const key = row.probeDate.toISOString().slice(0, 10)
    const cur = buckets.get(key) ?? { mentions: 0, total: 0 }
    cur.total += 1
    if (row.mentioned) cur.mentions += 1
    buckets.set(key, cur)
  }
  // Preencher dias sem dados (placeholder rate=0)
  const result: AsovTrendPoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const cur = buckets.get(key) ?? { mentions: 0, total: 0 }
    result.push({
      date: key,
      mentions: cur.mentions,
      total: cur.total,
      rate: cur.total > 0 ? cur.mentions / cur.total : 0,
    })
  }
  return result
}
