'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { ANALYTICS_PERIODS } from '@/constants/analytics-constants'
import type { AnalyticsPeriod } from '@/types/analytics'
import { trackEvent } from '@/lib/ga4'
import { GA4_EVENTS } from '@/constants/ga4-events'

interface PeriodSelectorProps {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
  disabled?: boolean
}

function PeriodSelectorComponent({ value, onChange, disabled }: PeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Selecionar período"
      className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit"
    >
      {ANALYTICS_PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(period.value)
            trackEvent({ name: GA4_EVENTS.ANALYTICS_PERIOD_CHANGED, params: { period: period.value } })
          }}
          aria-pressed={value === period.value}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors min-h-[32px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === period.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}

export const PeriodSelector = memo(PeriodSelectorComponent)
