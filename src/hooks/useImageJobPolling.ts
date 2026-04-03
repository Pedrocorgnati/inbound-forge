'use client'

// module-9: Image Job Polling Hook
// Rastreabilidade: TASK-4, G-001, FEAT-creative-generation-004
// Polls GET /api/image-jobs/[id] until terminal status

import { useEffect, useState, useCallback, useRef } from 'react'
import type { ImageJobStatus } from '@/types/image-worker'

const POLL_INTERVAL_MS = 3_000 // 3 segundos — alinhado com worker polling

interface ImageJobPollResult {
  id: string
  status: ImageJobStatus
  imageUrl: string | null
  errorMessage: string | null
  retryCount: number
  completedAt: string | null
}

interface UseImageJobPollingReturn {
  data: ImageJobPollResult | null
  isPolling: boolean
  error: string | null
  startPolling: (jobId: string) => void
  stopPolling: () => void
}

const TERMINAL_STATUSES: ImageJobStatus[] = ['DONE', 'FAILED', 'DEAD_LETTER']

export function useImageJobPolling(): UseImageJobPollingReturn {
  const [data, setData] = useState<ImageJobPollResult | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/image-jobs/${jobId}`)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json()
      const result: ImageJobPollResult = json.data ?? json
      setData(result)
      setError(null)

      if (TERMINAL_STATUSES.includes(result.status)) {
        cleanup()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao consultar status do job')
    }
  }, [cleanup])

  const startPolling = useCallback((jobId: string) => {
    cleanup()
    jobIdRef.current = jobId
    setData(null)
    setError(null)
    setIsPolling(true)

    // Fetch immediately
    poll(jobId)

    // Then poll on interval
    intervalRef.current = setInterval(() => {
      poll(jobId)
    }, POLL_INTERVAL_MS)
  }, [cleanup, poll])

  const stopPolling = useCallback(() => {
    jobIdRef.current = null
    cleanup()
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return { data, isPolling, error, startPolling, stopPolling }
}
