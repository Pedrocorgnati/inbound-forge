'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ExportThemesButton } from '@/components/themes/ExportThemesButton'
import { ThemesEmptyState } from '@/components/themes/ThemesEmptyState'
import { ThemesFilters, type ThemesFilterState } from './ThemesFilters'
import { ThemesTable, type ThemeRow } from './ThemesTable'
import { ThemesTabs, type ThemeTab } from './ThemesTabs'

interface ThemesResponse {
  data: ThemeRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

const PAGE_SIZE = 20

const DEFAULT_FILTERS: ThemesFilterState = {
  painCategory: '',
  scoreMin: '',
  scoreMax: '',
  source: '',
  dateFrom: '',
  dateTo: '',
}

interface ThemesIndexProps {
  locale: string
}

export function ThemesIndex({ locale }: ThemesIndexProps) {
  const [activeTab, setActiveTab] = useState<ThemeTab>('pending_approval')
  const [filters, setFilters] = useState<ThemesFilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [themes, setThemes] = useState<ThemeRow[]>([])
  const [pagination, setPagination] = useState<ThemesResponse['pagination'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      tab: activeTab,
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (activeTab === 'all' || activeTab === 'rejected' || activeTab === 'archived') {
      params.set('includeArchived', 'true')
    }
    if (filters.painCategory.trim()) params.set('painCategory', filters.painCategory.trim())
    if (filters.scoreMin.trim()) params.set('scoreMin', filters.scoreMin.trim())
    if (filters.scoreMax.trim()) params.set('scoreMax', filters.scoreMax.trim())
    if (filters.source) params.set('source', filters.source)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    return params
  }, [activeTab, filters, page])

  const loadThemes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/themes?${queryParams.toString()}`, {
        cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Falha ao carregar temas')
      }
      const payload = (await response.json()) as ThemesResponse
      setThemes(payload.data)
      setPagination(payload.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar os temas.')
      setThemes([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    loadThemes()
  }, [loadThemes])

  const hasFilters = Object.values(filters).some(Boolean)

  function handleTabChange(nextTab: ThemeTab) {
    setActiveTab(nextTab)
    setPage(1)
  }

  function handleFiltersChange(nextFilters: ThemesFilterState) {
    setFilters(nextFilters)
    setPage(1)
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  const exportFilters = useMemo(
    () => Object.fromEntries(queryParams.entries()),
    [queryParams]
  )

  return (
    <div data-testid="themes-page" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Temas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aprove, filtre e acompanhe oportunidades de conteudo geradas pelo motor de dores.
          </p>
        </div>
        <ExportThemesButton filters={exportFilters} />
      </div>

      <ThemesTabs activeTab={activeTab} onTabChange={handleTabChange} />
      <ThemesFilters filters={filters} onChange={handleFiltersChange} onClear={clearFilters} />

      {error && (
        <div
          role="alert"
          data-testid="themes-error"
          className="flex flex-col gap-3 rounded-md border border-danger/20 bg-danger/10 p-4 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadThemes}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3" data-testid="themes-loading">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!isLoading && !error && themes.length === 0 && (
        <ThemesEmptyState
          reason={hasFilters ? 'FILTER_EMPTY' : 'NO_THEMES'}
          onClearFilters={hasFilters ? clearFilters : undefined}
        />
      )}

      {!isLoading && !error && themes.length > 0 && (
        <div className="space-y-4">
          <ThemesTable themes={themes} locale={locale} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" data-testid="themes-total">
              {pagination?.total ?? 0} tema{(pagination?.total ?? 0) === 1 ? '' : 's'}
            </p>
            <Pagination
              total={pagination?.total ?? 0}
              page={pagination?.page ?? page}
              pageSize={pagination?.limit ?? PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
