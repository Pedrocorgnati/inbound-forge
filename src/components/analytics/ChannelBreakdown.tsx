'use client'

// ChannelBreakdown — mini-visualização de leads por canal
// INT-041

import React, { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CHANNEL_COLORS } from '@/constants/analytics-constants'
import type { Channel } from '@/types/enums'

interface ChannelBreakdownItem {
  channel: Channel
  count: number
}

interface ChannelBreakdownProps {
  breakdown: ChannelBreakdownItem[]
  className?: string
}

function ChannelBreakdownComponent({ breakdown, className }: ChannelBreakdownProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const total = breakdown.reduce((acc, item) => acc + item.count, 0)

  if (breakdown.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {breakdown.map((item) => {
        const width = total > 0 ? Math.round((item.count / total) * 100) : 0
        const color = CHANNEL_COLORS[item.channel] ?? '#6B7280'
        const label = item.channel.charAt(0) + item.channel.slice(1).toLowerCase()

        return (
          <div key={item.channel} className="relative flex items-center gap-1.5">
            <div
              style={{ width: 64 }}
              className="h-2 rounded-full bg-muted overflow-hidden"
              tabIndex={0}
              role="img"
              aria-label={`${label}: ${item.count} leads`}
              title={`${label}: ${item.count} leads`}
              onMouseEnter={() => setTooltip(`${label}: ${item.count} leads`)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip(`${label}: ${item.count} leads`)}
              onBlur={() => setTooltip(null)}
            >
              <div
                style={{ width: `${width}%`, backgroundColor: color }}
                className="h-full rounded-full transition-all"
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{label}</span>
          </div>
        )
      })}
      {tooltip && (
        <div className="absolute z-10 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  )
}

export const ChannelBreakdown = memo(ChannelBreakdownComponent)
