'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface CostTotals {
  totalUSD: number
  breakdown: { service: string; costUSD: number }[]
}

function getCostColor(cost: number): string {
  if (cost > 80) return 'text-danger border-danger/30 bg-danger/10'
  if (cost > 50) return 'text-warning border-warning/30 bg-warning/10'
  return 'text-success border-success/30 bg-success/10'
}

export function CostChip() {
  const [totals, setTotals] = useState<CostTotals | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/v1/api-usage/totals?period=month')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled) setTotals(json)
      } catch {
        // silencioso
      }
    }

    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const cost = totals?.totalUSD ?? 0
  const colorClass = totals ? getCostColor(cost) : 'text-muted-foreground border-border bg-transparent'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/health"
          data-testid="cost-chip"
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80',
            colorClass
          )}
        >
          {totals ? `$${cost.toFixed(2)}/mes` : '$--.--/mes'}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="space-y-1">
        {totals?.breakdown && totals.breakdown.length > 0 ? (
          totals.breakdown.map((item) => (
            <div key={item.service} className="flex items-center justify-between gap-4 text-xs">
              <span>{item.service}</span>
              <span className="font-medium">${item.costUSD.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <span className="text-xs">Carregando...</span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
