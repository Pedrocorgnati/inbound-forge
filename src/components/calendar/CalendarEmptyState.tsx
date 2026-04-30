'use client'

// TASK-14 ST001 (M11.13 / G-004) — Empty state contextual do calendario.
// Renderiza quando posts.length === 0 com CTA para criar primeiro post.
// Suporta variante "filtered" quando filtros ativos retornam vazio.

import * as React from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export interface CalendarEmptyStateProps {
  variant: 'week' | 'month' | 'list'
  /** Filtros aplicados que produziram resultado vazio. Se vazio/undefined, mostra empty state padrao. */
  activeFilters?: string[]
  onCreatePost: () => void
  onClearFilters?: () => void
  className?: string
}

export function CalendarEmptyState({
  variant,
  activeFilters,
  onCreatePost,
  onClearFilters,
  className,
}: CalendarEmptyStateProps) {
  const t = useTranslations('calendar.empty')
  const isFiltered = !!activeFilters && activeFilters.length > 0

  const message = isFiltered
    ? t('filtered', { channels: activeFilters.join(', ') })
    : t(variant)

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className,
      )}
    >
      <CalendarIcon className="size-10 text-muted-foreground/40" aria-hidden />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onCreatePost}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('cta')}
        </button>
        {isFiltered && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>
    </div>
  )
}
