'use client'

import { useCallback, useState } from 'react'

export interface AngleVersion {
  id: string
  version: number
  text: string
  charCount: number
  isCurrent: boolean
  createdAt: string
}

export interface UseAngleHistoryReturn {
  versions: AngleVersion[]
  isLoading: boolean
  error: string | null
  fetchHistory: (angleId: string) => Promise<void>
  restore: (version: number) => Promise<boolean>
}

export function useAngleHistory(themeId: string): UseAngleHistoryReturn {
  const [versions, setVersions] = useState<AngleVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentAngleId, setCurrentAngleId] = useState<string | null>(null)

  const fetchHistory = useCallback(
    async (angleId: string) => {
      setIsLoading(true)
      setError(null)
      setCurrentAngleId(angleId)
      try {
        const res = await fetch(`/api/content/${themeId}/angles/${angleId}/history`)
        if (!res.ok) throw new Error('Falha ao carregar histórico')
        const json = await res.json()
        const payload = json.data ?? json
        const rawVersions = payload.data ?? payload
        const mapped: AngleVersion[] = (Array.isArray(rawVersions) ? rawVersions : []).map(
          (v: { id: string; generationVersion: number; text: string; editedBody?: string | null; charCount: number; isSelected: boolean; createdAt: string }) => ({
            id: v.id,
            version: v.generationVersion,
            text: v.editedBody ?? v.text,
            charCount: v.charCount,
            isCurrent: v.isSelected,
            createdAt: v.createdAt,
          })
        )
        setVersions(mapped)
      } catch {
        setError('Não foi possível carregar o histórico de versões.')
        setVersions([])
      } finally {
        setIsLoading(false)
      }
    },
    [themeId]
  )

  const restore = useCallback(
    async (version: number): Promise<boolean> => {
      if (!currentAngleId) return false
      try {
        const res = await fetch(`/api/content/${themeId}/angles/${currentAngleId}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        })
        if (!res.ok) throw new Error('Falha ao restaurar versão')
        await fetchHistory(currentAngleId)
        return true
      } catch {
        setError('Não foi possível restaurar esta versão.')
        return false
      }
    },
    [themeId, currentAngleId, fetchHistory]
  )

  return { versions, isLoading, error, fetchHistory, restore }
}
