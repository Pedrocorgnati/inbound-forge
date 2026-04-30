'use client'

// TASK-REFORGE-2 ST002: CalendarListView — Agenda view cronológica para mobile
// Substitui o grid de 7 colunas em viewports < lg

import { format, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostMiniCard } from './PostMiniCard'
import { CalendarEmptyState } from './CalendarEmptyState'
import type { PublishingPost } from '@/types/publishing'

interface CalendarListViewProps {
  posts: Record<string, PublishingPost[]>
  currentDate: Date
  onPeriodChange: (direction: 'prev' | 'next' | 'today') => void
  onReschedule: (post: PublishingPost) => void
  /**
   * TASK-11 ST005 — propaga clique em data vazia para abrir PostFormDrawer.
   * Em list-view, e exposto via botao "Criar post para hoje" no empty state
   * (UX expandida por TASK-14 / G-004 — empty state contextual).
   */
  onSlotClick?: (slotId: string) => void
  /** TASK-14 ST002 (G-004) — filtros ativos para empty state contextual. */
  activeFilters?: string[]
  /** TASK-14 ST002 — callback para limpar filtros. */
  onClearFilters?: () => void
  isLoading?: boolean
}

function SkeletonList() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando posts...">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="ml-10 space-y-2">
            <div className="h-14 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-14 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CalendarListView({
  posts,
  currentDate,
  onPeriodChange,
  onReschedule,
  onSlotClick,
  activeFilters,
  onClearFilters,
  isLoading = false,
}: CalendarListViewProps) {
  const sortedDates = Object.keys(posts).sort()
  const hasPosts = sortedDates.length > 0
  const periodLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-4">
      {/* Header de navegação — mesmo estilo do CalendarGrid */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="font-medium capitalize text-foreground">{periodLabel}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPeriodChange('prev')}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onPeriodChange('today')}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => onPeriodChange('next')}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonList />
      ) : !hasPosts ? (
        <CalendarEmptyState
          variant="list"
          activeFilters={activeFilters}
          onClearFilters={onClearFilters}
          onCreatePost={() => onSlotClick?.(format(new Date(), 'yyyy-MM-dd'))}
        />
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dayPosts = posts[dateKey]
            if (!dayPosts?.length) return null

            const date = parseISO(dateKey)
            const isCurrentDay = isToday(date)

            return (
              <section key={dateKey} aria-label={format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}>
                {/* Cabeçalho do dia */}
                <div className={cn('mb-3 flex items-center gap-2.5 px-1', isCurrentDay && 'text-primary')}>
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      isCurrentDay
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                    aria-hidden
                  >
                    {format(date, 'd')}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium capitalize',
                      isCurrentDay ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    {isCurrentDay && (
                      <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        Hoje
                      </span>
                    )}
                  </span>
                </div>

                {/* Posts do dia */}
                <div className="space-y-2 pl-10">
                  {dayPosts.map((post) => (
                    <div key={post.id} className="group relative">
                      <PostMiniCard post={post} />
                      {/* Botão reagendar — acessível em mobile (sem hover-only) */}
                      <button
                        type="button"
                        onClick={() => onReschedule(post)}
                        className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2',
                          'rounded px-2 py-1 text-xs font-medium',
                          'text-muted-foreground hover:bg-muted hover:text-foreground',
                          'opacity-100 lg:opacity-0 lg:group-hover:opacity-100', // sempre visível em mobile
                          'transition-opacity',
                          'min-h-[32px]', // touch target mínimo
                        )}
                        aria-label={`Reagendar post: ${post.caption.slice(0, 30)}...`}
                      >
                        Reagendar
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
