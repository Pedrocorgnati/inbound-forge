import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressWidgetProps {
  published: number
  scheduled: number
  target: number
  collapsed: boolean
}

function getColor(pct: number): string {
  if (pct >= 80) return 'bg-success'
  if (pct >= 50) return 'bg-warning'
  return 'bg-danger'
}

function getTextColor(pct: number): string {
  if (pct >= 80) return 'text-success'
  if (pct >= 50) return 'text-warning'
  return 'text-danger'
}

export function ProgressWidget({ published, scheduled, target, collapsed }: ProgressWidgetProps) {
  const pct = target > 0 ? Math.min(Math.round((published / target) * 100), 100) : 0
  const barColor = getColor(pct)
  const textColor = getTextColor(pct)

  if (collapsed) {
    return (
      <div
        data-testid="sidebar-progress-widget"
        aria-label={`Progresso de conteúdo: ${published} de ${target} publicados`}
        className="p-3"
      >
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-[width] duration-300', barColor)} // RESOLVED: transition-all → transition-[width] (G011)
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="sidebar-progress-widget"
      aria-label={`Progresso de conteúdo: ${published} de ${target} publicados`}
      className="p-3 space-y-1.5"
    >
      <p className="text-xs font-medium text-muted-foreground">Progresso deste mês</p>
      <p className="text-sm font-semibold text-foreground">
        {published} publicados · {scheduled} agendados
      </p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {target > 0 ? `Meta: ${target}` : 'Meta não definida'}
        </span>
        {target > 0 && (
          <span className={cn('text-xs font-medium', textColor)}>{pct}%</span>
        )}
      </div>
      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', barColor)} // RESOLVED: transition-all → transition-[width] (G011)
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
