'use client'

// KpiGoals — Visualizacao de metas KPI (reunioes + custo mensal)
// Rastreabilidade: CL-133, CL-128, TASK-7 ST003

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, TrendingUp, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MeetingHistory {
  month: string
  meetings: number
  goalMet: boolean
}

interface CostBreakdownItem {
  provider: string
  totalUsd: number
  operationCount: number
}

interface KpiData {
  meetings: {
    current: number
    goal: number
    goalMet: boolean
    history: MeetingHistory[]
  }
  cost: {
    totalUsd: number
    targetUsd: number
    percentUsed: number
    withinBudget: boolean
    breakdown: CostBreakdownItem[]
  }
}

export function KpiGoals() {
  const [data, setData] = useState<KpiData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/analytics/kpi')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json.data ?? json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar KPIs')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="h-32 animate-pulse bg-muted/30 rounded-lg" /></Card>
        <Card><CardContent className="h-32 animate-pulse bg-muted/30 rounded-lg" /></Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="kpi-error">
        {error ?? 'Dados indisponíveis'}
      </p>
    )
  }

  const { meetings, cost } = data

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="kpi-goals">
      {/* Reunioes qualificadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Reuniões Qualificadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{meetings.current}</span>
            <div className="flex items-center gap-1.5">
              {meetings.goalMet ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                meta: {meetings.goal}/mês
              </span>
            </div>
          </div>

          {/* Historico 6 meses */}
          <div className="flex items-end gap-1" aria-label="Histórico de reuniões">
            {meetings.history.map((h) => (
              <div key={h.month} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t-sm transition-[width] ${
                    h.goalMet ? 'bg-green-500' : h.meetings > 0 ? 'bg-yellow-500' : 'bg-muted/50'
                  }`}
                  style={{ height: `${Math.max(4, h.meetings * 16)}px` }}
                  title={`${h.month}: ${h.meetings} reunião(ões)`}
                />
                <span className="text-[9px] text-muted-foreground rotate-45 origin-left">
                  {h.month.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custo operacional */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-primary" />
            Custo Operacional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">
              ${cost.totalUsd.toFixed(2)}
            </span>
            <div className="flex items-center gap-1.5">
              {cost.withinBudget ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                meta: ${cost.targetUsd}/mês
              </span>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{cost.percentUsed}% utilizado</span>
              <span>${cost.targetUsd} limite</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] ${
                  cost.percentUsed >= 100
                    ? 'bg-red-500'
                    : cost.percentUsed >= 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, cost.percentUsed)}%` }}
              />
            </div>
          </div>

          {/* Breakdown por provider */}
          {cost.breakdown.length > 0 && (
            <div className="space-y-1">
              {cost.breakdown.slice(0, 4).map((item) => (
                <div key={item.provider} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{item.provider}</span>
                  <span className="font-mono text-foreground">${item.totalUsd.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
