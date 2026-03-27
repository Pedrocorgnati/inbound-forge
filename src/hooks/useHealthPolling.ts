'use client'

import { useEffect, useState, useCallback } from 'react'
import type { HealthDetailedResponse } from '@/types/health'

const POLL_INTERVAL_MS = 30_000 // 30 segundos

export function useHealthPolling() {
  const [data, setData] = useState<HealthDetailedResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/health/detailed')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: HealthDetailedResponse = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/v1/health/detailed')
        if (!res.ok || cancelled) return
        const json: HealthDetailedResponse = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar status')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { data, isLoading, error, refresh }
}
