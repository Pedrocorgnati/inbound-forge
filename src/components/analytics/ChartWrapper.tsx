'use client'

// ChartWrapper — SSR-safe dynamic import para Recharts
// Recharts usa window internamente — ssr:false obrigatório (PERF-001)
// INT-040, INT-041

import React, { memo } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

interface ChartWrapperProps {
  height?: number
  className?: string
  children: React.ReactNode
  'aria-label'?: string
}

function SkeletonBar({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="w-full animate-pulse rounded-md bg-muted"
      role="status"
      aria-label="Carregando gráfico..."
    />
  )
}

/**
 * Wrapper SSR-safe para componentes Recharts.
 * Renderiza skeleton no servidor; chart no cliente após hidratação.
 * React.memo evita re-renders desnecessários quando props não mudam.
 */
function ChartWrapperInner({
  height = 300,
  className,
  children,
  'aria-label': ariaLabel,
}: ChartWrapperProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Gráfico de analytics'}
      className={cn('w-full', className)}
      style={{ height }}
    >
      {children}
    </div>
  )
}

export const ChartWrapper = memo(ChartWrapperInner)

/**
 * HOC para criar componentes de chart com dynamic import SSR-safe.
 * Uso: const FunnelChart = createDynamicChart(() => import('./FunnelChartInner'))
 */
export function createDynamicChart<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  height = 300
) {
  const DynamicChart = dynamic(importFn, {
    ssr: false,
    loading: () => <SkeletonBar height={height} />,
  })

  return memo(function DynamicChartWrapper(props: P) {
    return <DynamicChart {...props} />
  })
}

// Re-export tipos Recharts necessários para charts filhos
export type {
  TooltipProps,
} from 'recharts'
