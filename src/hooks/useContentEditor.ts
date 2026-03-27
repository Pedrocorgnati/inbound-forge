'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Channel, ContentAngle, FunnelStage, CTADestination } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AngleVariant {
  id: string
  pieceId: string
  angle: ContentAngle
  text: string
  editedBody: string | null
  charCount: number
  hashtags: string[]
  ctaText: string | null
  recommendedCTA: string
  suggestedChannel: Channel
  isSelected: boolean
  generationVersion: number
  createdAt: string
  updatedAt: string
}

export interface ContentPiece {
  id: string
  themeId: string
  status: string
  funnelStage: FunnelStage
  recommendedChannel: Channel
  selectedAngle: ContentAngle | null
  angles: AngleVariant[]
  createdAt: string
  updatedAt: string
}

export interface UseContentEditorReturn {
  piece: ContentPiece | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  selectedChannel: Channel
  selectedAngleId: string | null
  funnelStage: FunnelStage
  ctaDestination: CTADestination
  ctaCustomText: string
  generate: (forceRegenerate?: boolean) => Promise<void>
  selectAngle: (angleId: string) => void
  changeChannel: (channel: Channel) => void
  changeFunnelStage: (stage: FunnelStage) => void
  changeCTADestination: (dest: CTADestination) => void
  changeCTACustomText: (text: string) => void
  updateAngle: (angleId: string, editedBody: string) => Promise<void>
  approvePiece: (angleId: string) => Promise<boolean>
  rejectPiece: (reason: string, angle?: ContentAngle) => Promise<boolean>
  refetch: () => void
}

export function useContentEditor(themeId: string): UseContentEditorReturn {
  const [piece, setPiece] = useState<ContentPiece | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<Channel>('LINKEDIN' as Channel)
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null)
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('AWARENESS' as FunnelStage)
  const [ctaDestination, setCTADestination] = useState<CTADestination>('WHATSAPP' as CTADestination)
  const [ctaCustomText, setCTACustomText] = useState('')

  const fetchPiece = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/content/${themeId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setPiece(null)
          return
        }
        throw new Error('Falha ao carregar conteúdo')
      }
      const data: ContentPiece = await res.json()
      setPiece(data)
      if (data.recommendedChannel) setSelectedChannel(data.recommendedChannel)
      if (data.funnelStage) setFunnelStage(data.funnelStage)
      if (data.angles.length > 0) {
        const selected = data.angles.find((a) => a.isSelected)
        setSelectedAngleId(selected?.id ?? data.angles[0].id)
      }
    } catch {
      setError('Não foi possível carregar o conteúdo deste tema.')
    } finally {
      setIsLoading(false)
    }
  }, [themeId])

  useEffect(() => {
    fetchPiece()
  }, [fetchPiece])

  const generate = useCallback(
    async (forceRegenerate = false) => {
      setIsGenerating(true)
      setError(null)
      try {
        const res = await fetch(`/api/content/${themeId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            funnelStage,
            forceRegenerate,
            targetChannel: selectedChannel,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? 'Falha ao gerar conteúdo')
        }
        await fetchPiece()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao gerar conteúdo'
        setError(msg)
      } finally {
        setIsGenerating(false)
      }
    },
    [themeId, funnelStage, selectedChannel, fetchPiece]
  )

  const selectAngle = useCallback((angleId: string) => {
    setSelectedAngleId(angleId)
  }, [])

  const changeChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel)
  }, [])

  const changeFunnelStage = useCallback((stage: FunnelStage) => {
    setFunnelStage(stage)
  }, [])

  const changeCTADestination = useCallback((dest: CTADestination) => {
    setCTADestination(dest)
  }, [])

  const changeCTACustomText = useCallback((text: string) => {
    setCTACustomText(text)
  }, [])

  const updateAngle = useCallback(
    async (angleId: string, editedBody: string) => {
      try {
        const res = await fetch(`/api/content/${themeId}/angles/${angleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editedBody }),
        })
        if (!res.ok) throw new Error('Falha ao salvar edição')
        setPiece((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            angles: prev.angles.map((a) =>
              a.id === angleId ? { ...a, editedBody, charCount: editedBody.length } : a
            ),
          }
        })
      } catch {
        setError('Não foi possível salvar a edição.')
      }
    },
    [themeId]
  )

  const approvePiece = useCallback(
    async (angleId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/content/${themeId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedAngleId: angleId }),
        })
        if (!res.ok) throw new Error('Falha ao aprovar')
        await fetchPiece()
        return true
      } catch {
        setError('Não foi possível aprovar o conteúdo.')
        return false
      }
    },
    [themeId, fetchPiece]
  )

  const rejectPiece = useCallback(
    async (reason: string, angle?: ContentAngle): Promise<boolean> => {
      try {
        const res = await fetch(`/api/content/${themeId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, angle }),
        })
        if (!res.ok) throw new Error('Falha ao rejeitar')
        await fetchPiece()
        return true
      } catch {
        setError('Não foi possível rejeitar o conteúdo.')
        return false
      }
    },
    [themeId, fetchPiece]
  )

  return {
    piece,
    isLoading,
    isGenerating,
    error,
    selectedChannel,
    selectedAngleId,
    funnelStage,
    ctaDestination,
    ctaCustomText,
    generate,
    selectAngle,
    changeChannel,
    changeFunnelStage,
    changeCTADestination,
    changeCTACustomText,
    updateAngle,
    approvePiece,
    rejectPiece,
    refetch: fetchPiece,
  }
}
