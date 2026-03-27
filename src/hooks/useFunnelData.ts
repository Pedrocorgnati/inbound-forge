'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsPeriod, FunnelMetrics } from '@/types/analytics'

interface UseFunnelDataResult {
  data: FunnelMetrics | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useFunnelData(period: AnalyticsPeriod): UseFunnelDataResult {
  const [data, setData] = useState<FunnelMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const refetch = useCallback(() => setFetchTrigger((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    fetch(`/api/v1/analytics/funnel?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          setData(json.data as FunnelMetrics)
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar dados do funil'))
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
  }, [period, fetchTrigger])

  return { data, isLoading, error, refetch }
}
