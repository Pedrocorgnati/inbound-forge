'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KnowledgeProgress } from '@/lib/dtos/progress.dto'

const POLL_INTERVAL = 30_000 // 30 seconds
const UNLOCK_DISPLAY_MS = 3_000 // 3 seconds

export interface UseKnowledgeProgressReturn {
  data: KnowledgeProgress | null
  isLoading: boolean
  error: string | null
  justUnlocked: boolean
  refetch: () => void
}

export function useKnowledgeProgress(): UseKnowledgeProgressReturn {
  const [data, setData] = useState<KnowledgeProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [justUnlocked, setJustUnlocked] = useState(false)

  // Track previous overallUnlocked to detect transitions
  const prevUnlockedRef = useRef<boolean | null>(null)
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge/progress')
      if (!res.ok) throw new Error('Falha ao carregar progresso')

      const json: KnowledgeProgress = await res.json()
      setData(json)
      setError(null)

      // Detect unlock transition: previous was false, now is true
      if (
        prevUnlockedRef.current === false &&
        json.overallUnlocked === true
      ) {
        setJustUnlocked(true)
        unlockTimerRef.current = setTimeout(() => {
          setJustUnlocked(false)
        }, UNLOCK_DISPLAY_MS)
      }

      prevUnlockedRef.current = json.overallUnlocked
    } catch {
      setError('Não foi possível carregar o progresso.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Poll every 30s
  useEffect(() => {
    intervalRef.current = setInterval(fetchProgress, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchProgress])

  // Cleanup unlock timer on unmount
  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current)
      }
    }
  }, [])

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetchProgress()
  }, [fetchProgress])

  return {
    data,
    isLoading,
    error,
    justUnlocked,
    refetch,
  }
}
