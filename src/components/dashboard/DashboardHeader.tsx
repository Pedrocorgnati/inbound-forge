'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export interface DashboardFilters {
  painCategory?: string
  niche?: string
  scoreMin?: number
  scoreMax?: number
}

interface DashboardHeaderProps {
  total: number
  statusFilter: string | undefined
  onStatusFilter: (status: string | undefined) => void
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onGenerate: () => void
  onScoreAll: () => void
  isGenerating: boolean
  isScoringAll: boolean
}

export function DashboardHeader({
  total,
  statusFilter,
  onStatusFilter,
  filters,
  onFiltersChange,
  onGenerate,
  onScoreAll,
  isGenerating,
  isScoringAll,
}: DashboardHeaderProps) {
  const t = useTranslations('dashboard.themes')
  const [localScoreMin, setLocalScoreMin] = useState(filters.scoreMin ?? 0)
  const [localScoreMax, setLocalScoreMax] = useState(filters.scoreMax ?? 100)

  // Debounce 300ms no slider de score (CL-197 ST002)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localScoreMin !== (filters.scoreMin ?? 0) || localScoreMax !== (filters.scoreMax ?? 100)) {
        onFiltersChange({
          ...filters,
          scoreMin: localScoreMin > 0 ? localScoreMin : undefined,
          scoreMax: localScoreMax < 100 ? localScoreMax : undefined,
        })
      }
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScoreMin, localScoreMax])

  const statusTabs = [
    { label: t('statusAll'), value: undefined },
    { label: t('statusActive'), value: 'ACTIVE' },
    { label: t('statusRejected'), value: 'REJECTED' },
  ] as const

  const hasActiveFilters = Boolean(
    filters.painCategory || filters.niche || filters.scoreMin || filters.scoreMax,
  )

  function clearFilters() {
    setLocalScoreMin(0)
    setLocalScoreMax(100)
    onFiltersChange({})
  }

  return (
    <div data-testid="dashboard-header" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          {total > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('showing', { total })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onScoreAll}
            isLoading={isScoringAll}
            loadingText={t('calculating')}
            disabled={isScoringAll || isGenerating}
            className="min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
            {t('recalculate')}
          </Button>
          <Button
            size="sm"
            onClick={onGenerate}
            isLoading={isGenerating}
            loadingText={t('generating')}
            disabled={isGenerating || isScoringAll}
            className="min-h-[44px]"
          >
            <Sparkles className="h-4 w-4" />
            {t('generate')}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => onStatusFilter(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-muted/30 p-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Categoria de dor</span>
          <input
            type="text"
            value={filters.painCategory ?? ''}
            onChange={(e) =>
              onFiltersChange({ ...filters, painCategory: e.target.value || undefined })
            }
            placeholder="Ex: retention"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            data-testid="filter-pain-category"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium">Nicho</span>
          <input
            type="text"
            value={filters.niche ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, niche: e.target.value || undefined })}
            placeholder="Ex: saas"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            data-testid="filter-niche"
          />
        </label>
        <div className="flex flex-col gap-1 text-xs">
          <span className="font-medium">
            Score: {localScoreMin} - {localScoreMax}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={localScoreMin}
              onChange={(e) =>
                setLocalScoreMin(Math.min(Number(e.target.value), localScoreMax))
              }
              className="w-24"
              data-testid="filter-score-min"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={localScoreMax}
              onChange={(e) =>
                setLocalScoreMax(Math.max(Number(e.target.value), localScoreMin))
              }
              className="w-24"
              data-testid="filter-score-max"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            data-testid="filter-clear"
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
