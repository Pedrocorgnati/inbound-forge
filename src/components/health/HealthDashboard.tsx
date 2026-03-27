'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHealthPolling } from '@/hooks/useHealthPolling'
import { HealthCard } from './HealthCard'
import { AlertLogPanel } from './AlertLogPanel'
import { ApiUsageBreakdown } from './ApiUsageBreakdown'
import { ErrorHistoryList } from './ErrorHistoryList'
import type { HealthStatus } from '@/types/health'

const STATUS_CONFIG: Record<HealthStatus, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  ok: { label: 'Sistema Operacional', variant: 'success' },
  degraded: { label: 'Degradado', variant: 'warning' },
  down: { label: 'Fora do Ar', variant: 'danger' },
}

export function HealthDashboard() {
  const { data, isLoading, error, refresh } = useHealthPolling()

  const statusConfig = data ? STATUS_CONFIG[data.status] : null

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton variant="rectangle" className="h-6 w-40" />
          ) : statusConfig ? (
            <Badge
              data-testid="health-status-badge"
              variant={statusConfig.variant}
              className="text-sm px-3 py-1"
            >
              {statusConfig.label}
            </Badge>
          ) : null}
          {error && (
            <span className="text-xs text-danger">{error}</span>
          )}
        </div>
        <Button
          data-testid="health-refresh-button"
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Worker health cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangle" className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : data?.workers && data.workers.length > 0 ? (
        <div
          data-testid="health-cards-grid"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {data.workers.map((worker) => (
            <HealthCard
              key={worker.service}
              service={worker.service}
              status={worker.status}
              latencyMs={worker.latencyMs}
              lastCheck={worker.lastCheck}
              errorMessage={worker.errorMessage}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum worker encontrado</p>
      )}

      {/* Two-column: Alerts + API Usage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertLogPanel />
        <ApiUsageBreakdown />
      </div>

      {/* Error History */}
      <ErrorHistoryList />
    </div>
  )
}
