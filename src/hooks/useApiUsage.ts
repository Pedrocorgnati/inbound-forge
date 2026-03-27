'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ApiUsageData } from '@/types/health'

type Period = 'day' | 'week' | 'month'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

const cache: Record<string, { data: ApiUsageData[]; ts: number }> = {}

export function useApiUsage(period: Period = 'month') {
  const [data, setData] = useState<ApiUsageData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalCostUSD = data.reduce((sum, item) => sum + item.costUSD, 0)

  const fetchData = useCallback(async (p: Period) => {
    const cacheKey = `api-usage-${p}`
    const cached = cache[cacheKey]
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setData(cached.data)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const res = await fetch(`/api/v1/api-usage?period=${p}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiUsageData[] = await res.json()
      cache[cacheKey] = { data: json, ts: Date.now() }
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar uso de API')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  return { data, isLoading, totalCostUSD, error }
}
