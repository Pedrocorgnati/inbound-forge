import React from 'react'
import { cn } from '@/lib/utils'

interface UsageBarProps {
  percentUsed: number
  service: string
  label: string
  className?: string
}

function getBarColor(percent: number): string {
  if (percent >= 80) return 'bg-danger'
  if (percent >= 60) return 'bg-warning'
  return 'bg-success'
}

export function UsageBar({ percentUsed, service, label, className }: UsageBarProps) {
  const clamped = Math.min(100, Math.max(0, percentUsed))
  const isHighUsage = clamped >= 80

  return (
    <div data-testid={`usage-bar-${service.toLowerCase()}`} className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('font-semibold', isHighUsage ? 'text-danger' : 'text-muted-foreground')}>
          {clamped.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            getBarColor(clamped),
            isHighUsage && 'animate-pulse'
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${clamped.toFixed(0)}% utilizado`}
        />
      </div>
    </div>
  )
}
