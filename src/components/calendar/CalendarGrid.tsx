'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import type { PublishingPost } from '@/types/publishing'

type CalendarViewType = 'week' | 'month'

interface CalendarGridProps {
  posts: Record<string, PublishingPost[]>
  startDate: Date
  endDate: Date
  view: CalendarViewType
  onViewChange: (view: CalendarViewType) => void
  onPeriodChange: (direction: 'prev' | 'next' | 'today') => void
  /** TASK-11 ST005 — clique em data vazia abre PostFormDrawer no caller. */
  onSlotClick?: (slotId: string) => void
  isLoading: boolean
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="h-[100px] animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  )
}

function EmptyCalendar() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Nenhum post agendado neste periodo</p>
    </div>
  )
}

export function CalendarGrid({
  posts,
  startDate,
  endDate: _endDate,
  view,
  onViewChange,
  onPeriodChange,
  onSlotClick,
  isLoading,
}: CalendarGridProps) {
  const hasPosts = Object.keys(posts).length > 0
  const periodLabel = format(startDate, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border bg-card text-sm">
            <button
              type="button"
              onClick={() => onViewChange('week')}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                view === 'week'
                  ? 'bg-primary text-primary-foreground rounded-l-md'
                  : 'text-muted-foreground hover:bg-muted rounded-l-md',
              )}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => onViewChange('month')}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                view === 'month'
                  ? 'bg-primary text-primary-foreground rounded-r-md'
                  : 'text-muted-foreground hover:bg-muted rounded-r-md',
              )}
            >
              Mes
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPeriodChange('prev')}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-foreground">
            {periodLabel}
          </span>

          <button
            type="button"
            onClick={() => onPeriodChange('next')}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Proximo periodo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onPeriodChange('today')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid />
      ) : !hasPosts ? (
        <EmptyCalendar />
      ) : view === 'week' ? (
        <WeekView posts={posts} startDate={startDate} onSlotClick={onSlotClick} />
      ) : (
        <MonthView posts={posts} startDate={startDate} onSlotClick={onSlotClick} />
      )}
    </div>
  )
}
