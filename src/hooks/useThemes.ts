'use client'

import { useCallback, useEffect, useState } from 'react'
import { useKnowledgeProgress } from './useKnowledgeProgress'

export interface ThemeDto {
  id: string
  title: string
  status: 'ACTIVE' | 'DEPRIORITIZED' | 'REJECTED'
  conversionScore: number
  isNew: boolean
  rejectionReason: string | null
  rejectedAt: string | null
  pain: { title: string } | null
  nicheOpportunity: { isGeoReady: boolean } | null
}

interface ThemesResponse {
  data: ThemeDto[]
  meta: { page: number; limit: number; total: number }
}

export interface UseThemesReturn {
  themes: ThemeDto[]
  total: number
  isLoading: boolean
  error: string | null
  isLocked: boolean
  page: number
  statusFilter: string | undefined
  setStatusFilter: (s: string | undefined) => void
  setPage: (p: number) => void
  refetch: () => void
}

export function useThemes(): UseThemesReturn {
  const [themes, setThemes] = useState<ThemeDto[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const { data: progress, isLoading: progressLoading } = useKnowledgeProgress()
  const isLocked = !progressLoading && progress ? !progress.overallUnlocked : false

  const fetchThemes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/v1/themes?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar temas')

      const json: ThemesResponse = await res.json()
      setThemes(json.data)
      setTotal(json.meta.total)
      setError(null)
    } catch {
      setError('Não foi possível carregar os temas.')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchThemes()
  }, [fetchThemes])

  return {
    themes,
    total,
    isLoading,
    error,
    isLocked,
    page,
    statusFilter,
    setStatusFilter,
    setPage,
    refetch: fetchThemes,
  }
}
