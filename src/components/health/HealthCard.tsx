'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { formatDateRelative } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { WorkerStatus } from '@/types/enums'
import {
  Database,
  HardDrive,
  Globe,
  ImageIcon,
  Send,
  type LucideIcon,
} from 'lucide-react'

const WORKER_ICONS: Record<string, LucideIcon> = {
  DATABASE: Database,
  REDIS: HardDrive,
  SCRAPING: Globe,
  IMAGE: ImageIcon,
  PUBLISHING: Send,
}

const STATUS_STYLES: Record<WorkerStatus, { bg: string; dot: string; text: string }> = {
  [WorkerStatus.ACTIVE]: {
    bg: 'border-success/30',
    dot: 'bg-success',
    text: 'text-success',
  },
  [WorkerStatus.IDLE]: {
    bg: 'border-warning/30',
    dot: 'bg-warning',
    text: 'text-warning',
  },
  [WorkerStatus.ERROR]: {
    bg: 'border-danger/30',
    dot: 'bg-danger',
    text: 'text-danger',
  },
}

const STATUS_LABELS: Record<WorkerStatus, string> = {
  [WorkerStatus.ACTIVE]: 'Operacional',
  [WorkerStatus.IDLE]: 'Ocioso',
  [WorkerStatus.ERROR]: 'Erro',
}

interface HealthCardProps {
  service: string
  status: WorkerStatus
  latencyMs: number
  lastCheck: string
  errorMessage?: string
  className?: string
}

export function HealthCard({
  service,
  status,
  latencyMs,
  lastCheck,
  errorMessage,
  className,
}: HealthCardProps) {
  const styles = STATUS_STYLES[status]
  const Icon = WORKER_ICONS[service.toUpperCase()] ?? Globe
  const isError = status === WorkerStatus.ERROR

  return (
    <Card
      data-testid={`health-card-${service.toLowerCase()}`}
      className={cn('relative overflow-hidden', styles.bg, className)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                'bg-muted'
              )}
            >
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{service}</p>
              <p className={cn('text-xs font-medium', styles.text)}>
                {STATUS_LABELS[status]}
              </p>
            </div>
          </div>
          <span className="relative flex h-3 w-3">
            {isError && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                  styles.dot
                )}
              />
            )}
            <span className={cn('relative inline-flex h-3 w-3 rounded-full', styles.dot)} />
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span data-testid={`health-latency-${service.toLowerCase()}`}>
            {latencyMs}ms
          </span>
          <span>{formatDateRelative(new Date(lastCheck))}</span>
        </div>

        {errorMessage && (
          <p
            data-testid={`health-error-${service.toLowerCase()}`}
            className="mt-2 rounded bg-danger-bg px-2 py-1 text-xs text-[#991B1B]"
          >
            {errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
