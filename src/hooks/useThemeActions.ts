'use client'

import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/toast'

interface UseThemeActionsReturn {
  reject: (themeId: string, reason: string) => Promise<boolean>
  restore: (themeId: string) => Promise<boolean>
  generate: (forceRegenerate?: boolean) => Promise<{ created: number } | null>
  scoreAll: () => Promise<{ updated: number; durationMs: number } | null>
  isGenerating: boolean
  isScoringAll: boolean
}

export function useThemeActions(): UseThemeActionsReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isScoringAll, setIsScoringAll] = useState(false)

  const reject = useCallback(async (themeId: string, reason: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/themes/${themeId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code = body?.code
        if (code === 'THEME_051') {
          toast.error('Este tema já foi rejeitado.')
        } else {
          toast.error('Erro ao rejeitar. Tente novamente.')
        }
        return false
      }

      toast.success('Tema rejeitado')
      return true
    } catch {
      toast.error('Erro ao rejeitar. Tente novamente.')
      return false
    }
  }, [])

  const restore = useCallback(async (themeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/themes/${themeId}/restore`, {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code = body?.code
        if (code === 'THEME_052') {
          toast.error('Apenas temas rejeitados podem ser restaurados.')
        } else {
          toast.error('Erro ao restaurar. Tente novamente.')
        }
        return false
      }

      toast.success('Tema restaurado')
      return true
    } catch {
      toast.error('Erro ao restaurar. Tente novamente.')
      return false
    }
  }, [])

  const generate = useCallback(async (forceRegenerate = false) => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/v1/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      })

      if (!res.ok) {
        toast.error('Erro ao gerar temas. Tente novamente.')
        return null
      }

      const json = await res.json()
      const created = json.data?.created ?? json.created ?? 0
      if (created > 0) {
        toast.success(`${created} temas gerados`)
      } else {
        toast.info('Nenhum tema novo. Enriqueça a base de conhecimento.')
      }
      return { created }
    } catch {
      toast.error('Erro ao gerar temas. Tente novamente.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const scoreAll = useCallback(async () => {
    setIsScoringAll(true)
    try {
      const res = await fetch('/api/v1/themes/score-all', { method: 'POST' })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 429 || body?.error?.includes('andamento')) {
          toast.warning('Recálculo em andamento. Aguarde e tente novamente.')
        } else {
          toast.error('Erro ao recalcular scores.')
        }
        return null
      }

      const json = await res.json()
      const data = json.data ?? json
      toast.success(`Scores atualizados em ${data.durationMs}ms`)
      return { updated: data.updated, durationMs: data.durationMs }
    } catch {
      toast.error('Erro ao recalcular scores.')
      return null
    } finally {
      setIsScoringAll(false)
    }
  }, [])

  return { reject, restore, generate, scoreAll, isGenerating, isScoringAll }
}
