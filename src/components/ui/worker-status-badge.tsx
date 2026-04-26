'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { useFormatters } from '@/lib/i18n/formatters'
import { WorkerStatus, WorkerType } from '@/types/enums'

const STATUS_CONFIG: Record<
  WorkerStatus,
  { variant: 'default' | 'success' | 'danger'; label: string; pulse?: boolean }
> = {
  [WorkerStatus.IDLE]: { variant: 'default', label: 'Idle' },
  [WorkerStatus.ACTIVE]: { variant: 'success', label: 'Ativo', pulse: true },
  [WorkerStatus.ERROR]: { variant: 'danger', label: 'Erro' },
}

const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  [WorkerType.SCRAPING]: 'Scraping',
  [WorkerType.IMAGE]: 'Image',
  [WorkerType.VIDEO]: 'Video',
  [WorkerType.PUBLISHING]: 'Publishing',
}

export interface WorkerStatusBadgeProps {
  type: WorkerType
  status: WorkerStatus
  lastPing?: Date
  className?: string
}

export function WorkerStatusBadge({ type, status, lastPing, className }: WorkerStatusBadgeProps) {
  const t = useTranslations('workers')
  const fmt = useFormatters()
  const config = STATUS_CONFIG[status]
  const typeLabel = WORKER_TYPE_LABELS[type]

  // RESOLVED: G001/G002 — locale-aware date + translated label
  const pingText = lastPing
    ? t('lastPing', { time: fmt.dateTime(lastPing) })
    : undefined

  return (
    <Badge
      variant={config.variant}
      className={cn(className)}
      title={pingText}
    >
      {config.pulse && (
        <span className="relative mr-1 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {typeLabel} — {config.label}
    </Badge>
  )
}
