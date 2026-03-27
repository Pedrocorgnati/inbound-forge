import { prisma } from '@/lib/prisma'

export class AnalyticsService {
  async getFunnel() {
    // TODO: Implementar via /auto-flow execute — query completa com GA4 Data API
    const [totalLeads, totalConversions] = await Promise.all([
      prisma.lead.count(),
      prisma.conversionEvent.count(),
    ])
    return { totalLeads, totalConversions }
  }

  async getThemesRanking(limit = 20) {
    // TODO: Implementar via /auto-flow execute — learn-to-rank completo
    return prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { opportunityScore: 'desc' },
      take: limit,
    })
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
