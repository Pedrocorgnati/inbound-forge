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
  isLoading: boolean
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          className="h-[100px] animate-pulse rounded-md bg-gray-100"
        />
      ))}
    </div>
  )
}

function EmptyCalendar() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Calendar className="mb-4 h-12 w-12 text-gray-300" />
      <p className="text-sm text-gray-500">Nenhum post agendado neste periodo</p>
    </div>
  )
}

export function CalendarGrid({
  posts,
  startDate,
  endDate,
  view,
  onViewChange,
  onPeriodChange,
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
          <div className="inline-flex rounded-md border border-gray-200 bg-white text-sm">
            <button
              type="button"
              onClick={() => onViewChange('week')}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                view === 'week'
                  ? 'bg-indigo-600 text-white rounded-l-md'
                  : 'text-gray-600 hover:bg-gray-50 rounded-l-md',
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
                  ? 'bg-indigo-600 text-white rounded-r-md'
                  : 'text-gray-600 hover:bg-gray-50 rounded-r-md',
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
            className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-gray-800">
            {periodLabel}
          </span>

          <button
            type="button"
            onClick={() => onPeriodChange('next')}
            className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
            aria-label="Proximo periodo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onPeriodChange('today')}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
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
        <WeekView posts={posts} startDate={startDate} />
      ) : (
        <MonthView posts={posts} startDate={startDate} />
      )}
    </div>
  )
}
