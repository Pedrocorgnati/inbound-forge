'use client'

// SparklineChart — mini gráfico de tendência 80x30px SSR-safe
// INT-041 | PERF-001

import React, { memo } from 'react'
import dynamic from 'next/dynamic'

const SparklineChartInner = dynamic(() => import('./SparklineChartInner'), {
  ssr: false,
  loading: () => <div style={{ width: 80, height: 30 }} className="animate-pulse rounded bg-muted" />,
})

interface SparklineChartProps {
  trend: number[]
}

function SparklineChartComponent({ trend }: SparklineChartProps) {
  const isGrowing = trend.length > 0 && trend[trend.length - 1] >= trend[0]
  const label = isGrowing ? 'Tendência crescente' : 'Tendência decrescente'

  return (
    <div
      aria-label={`Tendência dos últimos 7 dias: ${label}`}
      style={{ width: 80, height: 30 }}
    >
      <SparklineChartInner trend={trend} />
    </div>
  )
}

export const SparklineChart = memo(SparklineChartComponent)
