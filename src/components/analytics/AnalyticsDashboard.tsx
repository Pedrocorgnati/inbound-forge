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
import { ChannelPerformanceCard } from './ChannelPerformanceCard'
import { ExportCSVButton } from './ExportCSVButton'
import { useFunnelData } from '@/hooks/useFunnelData'
import type { AnalyticsPeriod } from '@/types/analytics'
import type { GA4ReconciliationReport } from '@/lib/analytics-reconciliation'

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [funnelStageFilter, setFunnelStageFilter] = useState<string | null>(null)
  const { data: funnelData, isLoading: funnelLoading, error: funnelError, refetch: refetchFunnel } = useFunnelData(period)
  const [reconciliationStats, setReconciliationStats] = useState({ postsWithoutConversion: 0, leadsWithoutPost: 0 })
  const [ga4Source, setGA4Source] = useState<'ga4' | 'internal' | null>(null)
  const [ga4ReconReport, setGa4ReconReport] = useState<GA4ReconciliationReport | null>(null)

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

  useEffect(() => {
    async function loadGA4Reconciliation() {
      try {
        const res = await fetch('/api/v1/analytics/ga4-reconciliation')
        if (!res.ok) return
        const json = await res.json()
        const report: GA4ReconciliationReport = json.data ?? json
        if (report.ga4Available && report.hasDivergence) {
          setGa4ReconReport(report)
        }
      } catch {
        // silent — banner omitido em erro
      }
    }
    loadGA4Reconciliation()
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

      {/* Banner de divergência GA4 vs interno — TASK-9 */}
      {ga4ReconReport?.hasDivergence && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/40 dark:bg-amber-900/20"
        >
          <svg
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Divergência detectada entre GA4 e analytics interno
            </p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              {ga4ReconReport.divergentCount}{' '}
              {ga4ReconReport.divergentCount === 1 ? 'métrica diverge' : 'métricas divergem'} mais de
              15%:{' '}
              {ga4ReconReport.results
                .filter((r) => r.status === 'DIVERGENT')
                .map((r) => `${r.label} (GA4: ${r.ga4Value} / interno: ${r.internalValue})`)
                .join(', ')}
              . Adblockers e cookie consent podem causar divergências esperadas — veja{' '}
              <a
                href="/docs/ANALYTICS-RECONCILIATION.md"
                className="underline hover:no-underline"
              >
                documentação
              </a>
              .
            </p>
          </div>
        </div>
      )}

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

      {/* MS13-B004: Performance por Canal — cumpre P3 do BUDGET (visível na UI principal) */}
      <section aria-labelledby="channel-performance-heading">
        <h2 id="channel-performance-heading" className="text-base font-medium text-foreground mb-3">
          Performance por Canal
        </h2>
        <ChannelPerformanceCard period={period} />
      </section>

      {/* KPIs Operacionais — reunioes + custo (CL-128, CL-133) */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="text-base font-medium text-foreground mb-3">
          Metas e Custos
        </h2>
        <KpiGoals />
      </section>

      {/* Painel de reconciliação — id=reconciliation para anchor do ReconciliationBadge */}
      <section id="reconciliation" aria-labelledby="reconciliation-heading">
        <h2 id="reconciliation-heading" className="text-base font-medium text-foreground mb-3">
          Reconciliação de Dados
        </h2>
        <ReconciliationPanel />
      </section>
    </div>
  )
}
