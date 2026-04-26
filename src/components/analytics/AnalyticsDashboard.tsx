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
import { ReconciliationBadge } from './ReconciliationBadge'
import { KpiGoals } from './KpiGoals'
import { ExportCSVButton } from './ExportCSVButton'
import { useFunnelData } from '@/hooks/useFunnelData'
import type { AnalyticsPeriod } from '@/types/analytics'

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [funnelStageFilter, setFunnelStageFilter] = useState<string | null>(null)
  const { data: funnelData, isLoading: funnelLoading, error: funnelError, refetch: refetchFunnel } = useFunnelData(period)
  const [reconciliationStats, setReconciliationStats] = useState({ postsWithoutConversion: 0, leadsWithoutPost: 0 })
  const [ga4Source, setGA4Source] = useState<'ga4' | 'internal' | null>(null)

  useEffect(() => {
    trackEvent({ name: GA4_EVENTS.ANALYTICS_PAGE_VIEW })
  }, [])

  useEffect(() => {
    async function loadReconciliation() {
      try {
        const res = await fetch('/api/v1/analytics/reconciliation')
        if (!res.ok) return
        const json = await res.json()
        const data = json.data ?? json
        setReconciliationStats({
          postsWithoutConversion: data.postsWithoutConversion ?? 0,
          leadsWithoutPost: data.leadsWithoutPost ?? 0,
        })
      } catch {
        // silent — badge shows 0 on error
      }
    }
    loadReconciliation()
  }, [period])

  useEffect(() => {
    if (funnelError) {
      toast.error('Erro ao carregar métricas do funil')
    }
  }, [funnelError])

  useEffect(() => {
    async function loadGA4Source() {
      try {
        const today = new Date()
        const endDate = today.toISOString().split('T')[0]
        const startDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0]
        const res = await fetch(`/api/v1/analytics/ga4?startDate=${startDate}&endDate=${endDate}`)
        if (!res.ok) return
        const json = await res.json()
        setGA4Source(json.data?.source ?? json.source ?? null)
      } catch {
        // silent — badge omitido em erro
      }
    }
    loadGA4Source()
  }, [])

  return (
    <div className="space-y-6">
      {/* Controles do período + badge de reconciliação (CL-091) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            disabled={funnelLoading}
          />
          <ReconciliationBadge
            postsWithoutConversion={reconciliationStats.postsWithoutConversion}
            leadsWithoutPost={reconciliationStats.leadsWithoutPost}
          />
        </div>
        <div className="flex items-center gap-2">
          {ga4Source && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                ga4Source === 'ga4'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {ga4Source === 'ga4' ? 'GA4' : 'Dados internos'}
            </span>
          )}
          <ExportCSVButton period={period} />
        </div>
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
            <FunnelChart
              data={funnelData}
              loading={funnelLoading}
              onStageClick={(stage) => setFunnelStageFilter(prev => prev === stage ? null : stage)}
            />
          )}
        </div>
      </section>

      {/* Ranking de temas */}
      <section aria-labelledby="ranking-heading">
        <div className="flex items-center gap-2 mb-3">
          <h2 id="ranking-heading" className="text-base font-medium text-foreground">
            Ranking de Temas
          </h2>
          {funnelStageFilter && (
            <button
              type="button"
              onClick={() => setFunnelStageFilter(null)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              Filtro: {funnelStageFilter}
              <span aria-hidden>×</span>
            </button>
          )}
        </div>
        <ThemeRankingTable period={period} />
      </section>

      {/* KPIs Operacionais — reunioes + custo (CL-128, CL-133) */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="text-base font-medium text-foreground mb-3">
          Metas e Custos
        </h2>
        <KpiGoals />
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
