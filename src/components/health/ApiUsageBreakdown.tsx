'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'
import { useApiUsage } from '@/hooks/useApiUsage'
import { UsageBar } from './UsageBar'

type Period = 'day' | 'week' | 'month'

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mes',
}

export function ApiUsageBreakdown() {
  const [period, setPeriod] = useState<Period>('month')
  const { data, isLoading, totalCostUSD, error } = useApiUsage(period)

  return (
    <Card data-testid="api-usage-breakdown">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Uso de API
          </CardTitle>
          <div className="flex gap-1 rounded-md border border-border p-0.5" role="tablist">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                data-testid={`period-tab-${p}`}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
                  period === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rectangle" className="h-8 w-full" />
            <Skeleton variant="rectangle" className="h-8 w-full" />
            <Skeleton variant="rectangle" className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-danger">{error}</p>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum dado de uso disponivel
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {data.map((item) => (
                <UsageBar
                  key={item.service}
                  service={item.service}
                  label={item.service}
                  percentUsed={item.percentUsed}
                />
              ))}
            </div>
            <div
              data-testid="api-usage-total"
              className="mt-4 flex items-center justify-between border-t border-border pt-3"
            >
              <span className="text-sm font-medium text-foreground">Custo total</span>
              <span className="text-sm font-bold text-foreground">
                ${totalCostUSD.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
