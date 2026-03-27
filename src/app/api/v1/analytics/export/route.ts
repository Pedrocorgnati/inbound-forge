import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { getFunnelMetrics, getThemeRanking, getChannelPerformance } from '@/lib/analytics-queries'
import type { AnalyticsPeriod } from '@/types/analytics'

// GET /api/v1/analytics/export?period=30d
// INT-106 | INT-109 | COMP-003: sem PII | PERF-002: < 3s
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const rawPeriod = searchParams.get('period') ?? '30d'
  const period: AnalyticsPeriod = ['7d', '30d', '90d'].includes(rawPeriod)
    ? (rawPeriod as AnalyticsPeriod)
    : '30d'

  try {
    const [funnel, themes, channels] = await Promise.all([
      getFunnelMetrics(period, user!.id),
      getThemeRanking(user!.id, 'conversionScore', 1, 100, period),
      getChannelPerformance(period, user!.id),
    ])

    const lines: string[] = []

    // Seção: Funil
    lines.push('## Funil de Conversão')
    lines.push(`Período,${period}`)
    lines.push('Etapa,Volume,Taxa de Conversão (%)')
    for (const stage of funnel.stages) {
      lines.push(`${stage.label},${stage.count},${stage.conversionRate}`)
    }
    lines.push('')

    // Seção: Temas
    lines.push('## Ranking de Temas')
    lines.push('Tema,Score de Conversão (%),Leads,Conversões')
    for (const item of themes.items) {
      lines.push(`${item.themeName},${item.conversionScore},${item.leadsCount},${item.conversionsCount}`)
    }
    lines.push('')

    // Seção: Canais
    lines.push('## Performance por Canal')
    lines.push('Canal,Leads,Conversões,Taxa de Conversão (%)')
    for (const ch of channels) {
      lines.push(`${ch.channel},${ch.leadsCount},${ch.conversionsCount},${ch.conversionRate}`)
    }

    const csv = lines.join('\n')
    const date = new Date().toISOString().split('T')[0]
    const filename = `analytics-export-${date}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse('Erro ao gerar exportação', { status: 500 })
  }
}
