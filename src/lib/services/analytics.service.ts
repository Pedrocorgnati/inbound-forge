import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const GA4_CACHE_TTL = 60 * 15 // 15 minutos

// Lazy init — só cria client se credenciais GA4 disponíveis
function createGA4Client(): BetaAnalyticsDataClient | null {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!propertyId || !serviceAccountKey) return null

  try {
    let credentials: Record<string, unknown>
    try {
      // Aceita tanto base64 quanto JSON inline
      const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
      credentials = JSON.parse(decoded)
    } catch {
      credentials = JSON.parse(serviceAccountKey)
    }
    return new BetaAnalyticsDataClient({ credentials })
  } catch {
    console.error('[analytics] Falha ao inicializar cliente GA4')
    return null
  }
}

export interface GA4PageViewRow {
  page: string
  views: number
  sessions: number
}

export interface GA4EventRow {
  eventName: string
  count: number
}

export interface GA4ReportResult {
  source: 'ga4' | 'internal'
  data: GA4PageViewRow[] | GA4EventRow[]
  period: { startDate: string; endDate: string }
}

export class AnalyticsService {
  async getPageViews(startDate: string, endDate: string): Promise<GA4ReportResult> {
    const cacheKey = `ga4:pageviews:${startDate}:${endDate}`

    // Verificar cache Redis
    const cached = await redis.get<GA4ReportResult>(cacheKey).catch(() => null)
    if (cached) return cached

    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
    const client = createGA4Client()

    if (!client || !propertyId) {
      // Fallback: dados internos
      const result: GA4ReportResult = {
        source: 'internal',
        data: [],
        period: { startDate, endDate },
      }
      return result
    }

    try {
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 50,
      })

      const data: GA4PageViewRow[] = (response.rows ?? []).map((row) => ({
        page: row.dimensionValues?.[0]?.value ?? '/',
        views: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
        sessions: parseInt(row.metricValues?.[1]?.value ?? '0', 10),
      }))

      const result: GA4ReportResult = {
        source: 'ga4',
        data,
        period: { startDate, endDate },
      }

      await redis.set(cacheKey, result, { ex: GA4_CACHE_TTL }).catch(() => null)
      return result
    } catch (error) {
      console.error('[analytics] Erro GA4 getPageViews:', error)
      return { source: 'internal', data: [], period: { startDate, endDate } }
    }
  }

  async getEventCounts(
    startDate: string,
    endDate: string,
    eventNames?: string[],
  ): Promise<GA4ReportResult> {
    const cacheKey = `ga4:events:${startDate}:${endDate}:${(eventNames ?? []).join(',')}`

    const cached = await redis.get<GA4ReportResult>(cacheKey).catch(() => null)
    if (cached) return cached

    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
    const client = createGA4Client()

    if (!client || !propertyId) {
      return { source: 'internal', data: [], period: { startDate, endDate } }
    }

    try {
      const dimensionFilter = eventNames?.length
        ? {
            filter: {
              fieldName: 'eventName',
              inListFilter: { values: eventNames },
            },
          }
        : undefined

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter,
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 100,
      })

      const data: GA4EventRow[] = (response.rows ?? []).map((row) => ({
        eventName: row.dimensionValues?.[0]?.value ?? '',
        count: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      }))

      const result: GA4ReportResult = {
        source: 'ga4',
        data,
        period: { startDate, endDate },
      }

      await redis.set(cacheKey, result, { ex: GA4_CACHE_TTL }).catch(() => null)
      return result
    } catch (error) {
      console.error('[analytics] Erro GA4 getEventCounts:', error)
      return { source: 'internal', data: [], period: { startDate, endDate } }
    }
  }

  async getGA4Report(
    startDate: string,
    endDate: string,
    metrics: string[],
  ): Promise<GA4ReportResult> {
    if (metrics.includes('pageViews') || metrics.includes('sessions')) {
      return this.getPageViews(startDate, endDate)
    }
    return this.getEventCounts(startDate, endDate, metrics)
  }

  async getFunnel() {
    const [totalLeads, totalConversions] = await Promise.all([
      prisma.lead.count(),
      prisma.conversionEvent.count(),
    ])
    return { totalLeads, totalConversions }
  }

  async getThemesRanking(limit = 20) {
    return prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { opportunityScore: 'desc' },
      take: limit,
    })
  }

  async getConversionsByTheme(): Promise<Record<string, number>> {
    // ConversionEvent não possui themeId — retorna vazio
    return {}
  }

  async runWeeklyReconciliation() {
    // TODO: Implementar via /auto-flow execute
    // 1. Buscar posts publicados sem lead associado (click_without_conversion)
    // 2. Buscar leads sem post de first-touch (conversion_without_post)
    // 3. Criar ReconciliationItem para cada gap
    throw new Error('Not implemented — run /auto-flow execute')
  }
}

export const analyticsService = new AnalyticsService()
