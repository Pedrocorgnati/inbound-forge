'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsPeriod, ThemeRanking } from '@/types/analytics'

type SortBy = 'conversionScore' | 'leadsCount'
type SortDir = 'asc' | 'desc'

interface UseThemeRankingResult {
  items: ThemeRanking[]
  total: number
  totalPages: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useThemeRanking(
  period: AnalyticsPeriod,
  sortBy: SortBy = 'conversionScore',
  page = 1,
  limit = 20,
  sortDir: SortDir = 'desc'
): UseThemeRankingResult {
  const [items, setItems] = useState<ThemeRanking[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const refetch = useCallback(() => setFetchTrigger((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      period,
      sortBy,
      sortDir,
      page: String(page),
      limit: String(limit),
    })

    fetch(`/api/v1/analytics/themes?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          setItems(json.data as ThemeRanking[])
          setTotal(json.pagination?.total ?? 0)
          setTotalPages(json.pagination?.totalPages ?? 0)
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar ranking'))
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error('Erro de rede'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [period, sortBy, sortDir, page, limit, fetchTrigger])

  return { items, total, totalPages, isLoading, error, refetch }
}
