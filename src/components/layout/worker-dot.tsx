'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatRelativeTime } from '@/lib/utils'
import type { WorkerStatus, WorkerType } from '@/types'

const WORKER_LABELS: Record<WorkerType, string> = {
  SCRAPING: 'Scraping',
  IMAGE: 'Imagens',
  VIDEO: 'Vídeo',
  PUBLISHING: 'Publicação',
}

// RESOLVED: cores hardcoded substituídas por tokens semânticos (G009)
const STATUS_DOT: Record<WorkerStatus, string> = {
  ACTIVE: 'bg-success animate-pulse',
  IDLE: 'bg-muted-foreground',
  ERROR: 'bg-danger',
}

const STATUS_LABEL: Record<WorkerStatus, string> = {
  ACTIVE: 'executando',
  IDLE: 'inativo',
  ERROR: 'erro',
}

interface WorkerDotProps {
  type: WorkerType
  status: WorkerStatus
  lastSeen: Date | null
  locale: string
}

export function WorkerDot({ type, status, lastSeen, locale }: WorkerDotProps) {
  const router = useRouter()
  const label = WORKER_LABELS[type]
  const isError = status === 'ERROR'

  const tooltipContent = (
    <div className="text-xs space-y-0.5">
      <p className="font-medium">
        {label}: {STATUS_LABEL[status]}
      </p>
      <p className="text-muted-foreground">
        Último ping: {lastSeen ? formatRelativeTime(lastSeen) : 'desconhecido'}
      </p>
      {isError && (
        <p className="text-danger mt-1">→ Ver detalhes em Analytics</p>
      )}
    </div>
  )

  const dot = (
    <div
      className={cn(
        'flex items-center gap-2',
        isError && 'cursor-pointer'
      )}
      role={isError ? 'button' : undefined}
      tabIndex={isError ? 0 : undefined}
      aria-label={isError ? `Worker ${label} com erro — clique para ver detalhes` : undefined}
      onClick={isError ? () => router.push(`/${locale}/analytics?filter=worker-error`) : undefined}
      onKeyDown={
        isError
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                router.push(`/${locale}/analytics?filter=worker-error`)
              }
            }
          : undefined
      }
    >
      <span className={cn('w-3 h-3 rounded-full shrink-0', STATUS_DOT[status])} />
      {isError && <AlertCircle className="h-3 w-3 text-danger" aria-hidden />}
      <span className="hidden lg:inline text-xs text-muted-foreground">{label}</span>
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center min-h-[44px] min-w-[44px]">{dot}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
    </Tooltip>
  )
}
