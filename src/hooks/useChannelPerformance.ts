'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnalyticsPeriod, ChannelPerformance } from '@/types/analytics'

interface UseChannelPerformanceResult {
  channels: ChannelPerformance[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * MS13-B004/B005: consome /api/v1/analytics/channels (cache Redis 5min via getCachedAnalytics).
 * Mantém o mesmo padrão dos hooks de funil/ranking para o dashboard.
 */
export function useChannelPerformance(period: AnalyticsPeriod): UseChannelPerformanceResult {
  const [channels, setChannels] = useState<ChannelPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setError(null)

    fetch(`/api/v1/analytics/channels?period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          const data = (json.data ?? json) as { channels?: ChannelPerformance[] }
          setChannels(data.channels ?? [])
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar canais'))
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
  }, [period, trigger])

  return { channels, isLoading, error, refetch }
}
