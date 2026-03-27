'use client'

// FunnelChart — dynamic import SSR-safe para Recharts
// INT-040, INT-041 | PERF-001: charts render < 1s

import React, { memo } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { FunnelMetrics } from '@/types/analytics'
import { EmptyState } from '@/components/shared/empty-state'
import { BarChart3 } from 'lucide-react'

const HEIGHT = 300

function SkeletonChart() {
  return (
    <div style={{ height: HEIGHT }} className="w-full animate-pulse rounded-md bg-muted" role="status" aria-label="Carregando gráfico..." />
  )
}

const FunnelChartInner = dynamic(() => import('./FunnelChartInner'), {
  ssr: false,
  loading: () => <SkeletonChart />,
})

interface FunnelChartProps {
  data: FunnelMetrics | null
  loading?: boolean
  className?: string
}

function FunnelChartComponent({ data, loading, className }: FunnelChartProps) {
  return (
    <div
      role="img"
      aria-label="Gráfico de funil de conversão"
      className={cn('w-full', className)}
      style={{ height: HEIGHT }}
    >
      {loading || !data ? (
        <SkeletonChart />
      ) : data.stages.every((s) => s.count === 0) ? (
        <div style={{ height: HEIGHT }} className="flex items-center justify-center">
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Nenhum dado para o período selecionado"
            description="Publique conteúdo e rastreie conversões para ver o funil"
          />
        </div>
      ) : (
        <>
          <FunnelChartInner data={data} />
          {/* Tabela acessível para screen readers — aria-hidden no chart visual */}
          <table className="sr-only" aria-label="Dados do funil de conversão">
            <thead>
              <tr>
                <th>Estágio</th>
                <th>Quantidade</th>
                <th>Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody>
              {data.stages.map((stage) => (
                <tr key={stage.label}>
                  <td>{stage.label}</td>
                  <td>{stage.count}</td>
                  <td>{stage.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export const FunnelChart = memo(FunnelChartComponent)
