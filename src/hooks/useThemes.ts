'use client'

import { useCallback, useEffect, useState } from 'react'
import { useKnowledgeProgress } from './useKnowledgeProgress'

export interface ThemeScoreBreakdown {
  painRelevance?: number
  caseStrength?: number
  geoMultiplier?: number
  recencyBonus?: number
  asovBonus?: number
  conversionMultiplier?: number
  baseScore?: number
  finalScore?: number
  computedAt?: string
}

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
  scoreBreakdown?: ThemeScoreBreakdown | null
  // Intake Review TASK-5 ST001 (CL-170): bonus GEO exposto ao cliente para renderizacao.
  // Serializado como fracao (0.10 = +10%). Derivado de scoreBreakdown.geoBonus quando presente.
  geoBonus?: {
    totalBonus: number
    isQuestion: boolean
    hasData: boolean
    isComparison: boolean
  } | null
}

export interface ThemeFilters {
  painCategory?: string
  niche?: string
  scoreMin?: number
  scoreMax?: number
}

interface ThemesResponse {
  data: ThemeDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }
}

export interface UseThemesReturn {
  themes: ThemeDto[]
  total: number
  isLoading: boolean
  error: string | null
  isLocked: boolean
  page: number
  statusFilter: string | undefined
  filters: ThemeFilters
  setStatusFilter: (s: string | undefined) => void
  setFilters: (f: ThemeFilters) => void
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
  const [filters, setFilters] = useState<ThemeFilters>({})

  const { data: progress, isLoading: progressLoading } = useKnowledgeProgress()
  const isLocked = !progressLoading && progress ? !progress.overallUnlocked : false

  const fetchThemes = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (filters.painCategory) params.set('painCategory', filters.painCategory)
      if (filters.niche) params.set('niche', filters.niche)
      if (filters.scoreMin !== undefined) params.set('scoreMin', String(filters.scoreMin))
      if (filters.scoreMax !== undefined) params.set('scoreMax', String(filters.scoreMax))

      const res = await fetch(`/api/v1/themes?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar temas')

      const json: ThemesResponse = await res.json()
      setThemes(json.data)
      setTotal(json.pagination.total)
      setError(null)
    } catch {
      setError('Não foi possível carregar os temas.')
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, filters])

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
    filters,
    setStatusFilter,
    setFilters,
    setPage,
    refetch: fetchThemes,
  }
}
