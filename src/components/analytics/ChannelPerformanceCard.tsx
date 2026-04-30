'use client'

// ChannelPerformanceCard — bloco visível de Performance por Canal no dashboard.
// MS13-B004: cumpre P3 do BUDGET (gráficos de tendência semanal e desempenho por canal).

import React, { memo } from 'react'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { useChannelPerformance } from '@/hooks/useChannelPerformance'
import { useFormatters } from '@/lib/i18n/formatters'
import { CHANNEL_COLORS } from '@/constants/analytics-constants'
import type { AnalyticsPeriod } from '@/types/analytics'
import type { Channel } from '@/types/enums'

interface ChannelPerformanceCardProps {
  period: AnalyticsPeriod
}

const CHANNEL_LABELS: Record<Channel, string> = {
  BLOG: 'Blog',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE_SHORTS: 'YouTube Shorts',
} as const

function ChannelPerformanceCardComponent({ period }: ChannelPerformanceCardProps) {
  const fmt = useFormatters()
  const { channels, isLoading, error, refetch } = useChannelPerformance(period)

  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-border bg-surface overflow-hidden"
        aria-busy="true"
        aria-label="Carregando performance por canal..."
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Canal', 'Leads', 'Conversões', 'Taxa de Conversão'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-3 py-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">Erro ao carregar performance por canal</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <EmptyState
          icon={<BarChart3 className="h-8 w-8" />}
          title="Sem dados de canal no período"
          description="Registre leads com canal preenchido para ver o desempenho por canal."
        />
      </div>
    )
  }

  // Maior leadsCount para barra horizontal proporcional (sem dependência adicional).
  const maxLeads = channels.reduce((acc, c) => Math.max(acc, c.leadsCount), 0) || 1

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          aria-label="Performance por canal de distribuição"
        >
          <caption className="sr-only">
            Performance por canal no período de {period}: leads gerados, conversões registradas e taxa de conversão.
          </caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Canal
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Leads
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
                Conversões
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                title="% de leads do canal que converteram no período"
              >
                Taxa de Conversão
              </th>
            </tr>
          </thead>
          <tbody>
            {channels.map((row) => {
              const barWidth = Math.max(2, Math.round((row.leadsCount / maxLeads) * 100))
              const color = CHANNEL_COLORS[row.channel] ?? '#888'
              return (
                <tr key={row.channel} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {CHANNEL_LABELS[row.channel] ?? row.channel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{fmt.number(row.leadsCount)}</span>
                      <span
                        aria-hidden
                        className="hidden md:inline-block h-1.5 rounded-full bg-muted/40 overflow-hidden"
                        style={{ width: 80 }}
                      >
                        <span
                          className="block h-full"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums hidden sm:table-cell">
                    {fmt.number(row.conversionsCount)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.conversionRate}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const ChannelPerformanceCard = memo(ChannelPerformanceCardComponent)
