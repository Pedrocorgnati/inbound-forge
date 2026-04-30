// analytics-reconciliation.ts — Reconciliação GA4 vs analytics interno
// TASK-9 | A-008 (AVISO) | COMP-003: sem PII | SEC-008: sem dados pessoais

import { prisma } from '@/lib/prisma'
import { analyticsService } from '@/lib/services/analytics.service'
import { getCachedAnalytics } from '@/lib/analytics-cache'

const DIVERGENCE_THRESHOLD = 0.15 // 15% de diferença é aceitável
const CACHE_TTL = 900 // 15 minutos — não precisa de refresh frequente

export interface GA4ReconciliationResult {
  metric: string
  label: string
  ga4Value: number
  internalValue: number
  divergencePercent: number
  status: 'OK' | 'DIVERGENT' | 'MISSING_DATA'
}

export interface GA4ReconciliationReport {
  computedAt: string
  ga4Available: boolean
  results: GA4ReconciliationResult[]
  divergentCount: number
  hasDivergence: boolean
}

function defaultPeriod(): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString().split('T')[0]
  const start = new Date()
  start.setDate(start.getDate() - 30)
  const startDate = start.toISOString().split('T')[0]
  return { startDate, endDate }
}

// Métricas comparáveis entre GA4 e banco interno (últimos 30 dias)
// GA4 conta eventos disparados via gtag.js/Measurement Protocol
// Interno conta registros no banco — divergências esperadas por adblockers e cookie consent
const COMPARABLE_METRICS: Array<{
  key: string
  label: string
  ga4EventName: string
  fetchInternal: () => Promise<number>
}> = [
  {
    key: 'leads',
    label: 'Leads registrados',
    ga4EventName: 'lead_created',
    fetchInternal: async () => {
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return prisma.lead.count({ where: { createdAt: { gte: from } } })
    },
  },
  {
    key: 'publications',
    label: 'Publicações',
    ga4EventName: 'content_published',
    fetchInternal: async () => {
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return prisma.post.count({ where: { publishedAt: { gte: from, not: null } } })
    },
  },
]

/**
 * Compara métricas GA4 (via Data API) com contagens internas do banco.
 * Fire-and-forget seguro — falhas retornam MISSING_DATA, nunca propagam erros.
 * SEC-008: sem PII nas métricas — apenas contagens agregadas.
 */
export async function reconcileGA4Metrics(
  period: { startDate: string; endDate: string } = defaultPeriod()
): Promise<GA4ReconciliationReport> {
  const cacheKey = `analytics:ga4-recon:${period.startDate}:${period.endDate}`

  return getCachedAnalytics(cacheKey, CACHE_TTL, async () => {
    const ga4Available = !!(
      process.env.GOOGLE_ANALYTICS_PROPERTY_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    )

    const results: GA4ReconciliationResult[] = []

    for (const metric of COMPARABLE_METRICS) {
      try {
        const [ga4Report, internalValue] = await Promise.all([
          ga4Available
            ? analyticsService.getEventCounts(period.startDate, period.endDate, [metric.ga4EventName])
            : Promise.resolve({ source: 'internal' as const, data: [], period }),
          metric.fetchInternal(),
        ])

        if (!ga4Available || ga4Report.source === 'internal') {
          results.push({
            metric: metric.key,
            label: metric.label,
            ga4Value: 0,
            internalValue,
            divergencePercent: 0,
            status: 'MISSING_DATA',
          })
          continue
        }

        const eventRows = ga4Report.data as Array<{ eventName: string; count: number }>
        const ga4Value = eventRows.find((e) => e.eventName === metric.ga4EventName)?.count ?? 0

        const divergence =
          ga4Value > 0
            ? Math.abs(ga4Value - internalValue) / ga4Value
            : internalValue > 0
            ? 1
            : 0

        results.push({
          metric: metric.key,
          label: metric.label,
          ga4Value,
          internalValue,
          divergencePercent: Math.round(divergence * 100),
          status: divergence > DIVERGENCE_THRESHOLD ? 'DIVERGENT' : 'OK',
        })
      } catch {
        // Falha silenciosa — métrica individual não bloqueia as demais
        results.push({
          metric: metric.key,
          label: metric.label,
          ga4Value: 0,
          internalValue: 0,
          divergencePercent: 0,
          status: 'MISSING_DATA',
        })
      }
    }

    const divergentCount = results.filter((r) => r.status === 'DIVERGENT').length

    return {
      computedAt: new Date().toISOString(),
      ga4Available,
      results,
      divergentCount,
      hasDivergence: divergentCount > 0,
    }
  })
}
