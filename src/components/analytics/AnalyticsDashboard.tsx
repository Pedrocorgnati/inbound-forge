'use client'

// AnalyticsDashboard — Client component raiz do módulo de analytics
// INT-003, INT-040, INT-041

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { trackEvent } from '@/lib/ga4'
import { GA4_EVENTS } from '@/constants/ga4-events'
import { Button } from '@/components/ui/button'
import { PeriodSelector } from './PeriodSelector'
import { FunnelChart } from './FunnelChart'
import { ThemeRankingTable } from './ThemeRankingTable'
import { ReconciliationPanel } from './ReconciliationPanel'
import { ExportCSVButton } from './ExportCSVButton'
import { useFunnelData } from '@/hooks/useFunnelData'
import type { AnalyticsPeriod } from '@/types/analytics'

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const { data: funnelData, isLoading: funnelLoading, error: funnelError, refetch: refetchFunnel } = useFunnelData(period)

  useEffect(() => {
    trackEvent({ name: GA4_EVENTS.ANALYTICS_PAGE_VIEW })
  }, [])

  useEffect(() => {
    if (funnelError) {
      toast.error('Erro ao carregar métricas do funil')
    }
  }, [funnelError])

  return (
    <div className="space-y-6">
      {/* Controles do período */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          disabled={funnelLoading}
        />
        <ExportCSVButton period={period} />
      </div>

      {/* Funil de conversão */}
      <section aria-labelledby="funnel-heading">
        <h2 id="funnel-heading" className="text-base font-medium text-foreground mb-3">
          Funil de Conversão
        </h2>
        <div className="rounded-lg border border-border bg-surface p-4">
          {funnelError ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">Erro ao carregar métricas do funil</p>
              <Button variant="outline" size="sm" onClick={() => refetchFunnel()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <FunnelChart data={funnelData} loading={funnelLoading} />
          )}
        </div>
      </section>

      {/* Ranking de temas */}
      <section aria-labelledby="ranking-heading">
        <h2 id="ranking-heading" className="text-base font-medium text-foreground mb-3">
          Ranking de Temas
        </h2>
        <ThemeRankingTable period={period} />
      </section>

      {/* Painel de reconciliação */}
      <section aria-labelledby="reconciliation-heading">
        <h2 id="reconciliation-heading" className="text-base font-medium text-foreground mb-3">
          Reconciliação de Dados
        </h2>
        <ReconciliationPanel />
      </section>
    </div>
  )
}
