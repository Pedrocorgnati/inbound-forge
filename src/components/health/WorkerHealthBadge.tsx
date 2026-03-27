'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { WorkerStatus } from '@/types/enums'

const CONFIG: Record<WorkerStatus, { color: string; label: string; pulse: boolean }> = {
  [WorkerStatus.ACTIVE]: { color: 'bg-success', label: 'Operacional', pulse: false },
  [WorkerStatus.IDLE]: { color: 'bg-warning', label: 'Ocioso', pulse: false },
  [WorkerStatus.ERROR]: { color: 'bg-danger', label: 'Erro', pulse: true },
}

interface WorkerHealthBadgeProps {
  status: WorkerStatus
  className?: string
}

export function WorkerHealthBadge({ status, className }: WorkerHealthBadgeProps) {
  const { color, label, pulse } = CONFIG[status]

  return (
    <span
      data-testid={`worker-health-badge-${status.toLowerCase()}`}
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-foreground', className)}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              color
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
      </span>
      {label}
    </span>
  )
}
