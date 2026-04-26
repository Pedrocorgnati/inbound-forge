import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface MonthlyCostBadgeProps {
  cost: number | null
  budget?: number
}

const DEFAULT_BUDGET = 100

function getThreshold(cost: number, budget: number): 'healthy' | 'warning' | 'critical' {
  const ratio = cost / budget
  if (ratio > 0.95) return 'critical'
  if (ratio > 0.8) return 'warning'
  return 'healthy'
}

const THRESHOLD_CLASSES = {
  healthy: 'text-success border-success/30 bg-success/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  critical: 'text-danger border-danger/30 bg-danger/10',
  none: 'text-muted-foreground border-border bg-transparent',
}

export function MonthlyCostBadge({ cost, budget = DEFAULT_BUDGET, locale }: MonthlyCostBadgeProps & { locale?: string }) {
  const threshold =
    cost != null && budget > 0 ? getThreshold(cost, budget) : 'none'
  const thresholdKey = cost != null ? threshold : 'none'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium md:text-sm cursor-default select-none',
            THRESHOLD_CLASSES[thresholdKey]
          )}
        >
          {cost != null ? formatCurrency(cost) : 'R$ --'}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <Link href={locale ? `/${locale}/health` : '/health'} className="text-xs underline hover:text-primary">
          Ver detalhes de custo
        </Link>
      </TooltipContent>
    </Tooltip>
  )
}
