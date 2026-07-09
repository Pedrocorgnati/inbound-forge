'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
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
  const tToast = useTranslations('toasts')

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
          toast.error(tToast('theme.already_rejected'))
        } else {
          toast.error(tToast('theme.reject_failed'))
        }
        return false
      }

      toast.success(tToast('theme.rejected'))
      return true
    } catch {
      toast.error(tToast('theme.reject_failed'))
      return false
    }
  }, [tToast])

  const restore = useCallback(async (themeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/themes/${themeId}/restore`, {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const code = body?.code
        if (code === 'THEME_052') {
          toast.error(tToast('theme.only_rejected_restorable'))
        } else {
          toast.error(tToast('theme.restore_failed'))
        }
        return false
      }

      toast.success(tToast('theme.restored'))
      return true
    } catch {
      toast.error(tToast('theme.restore_failed'))
      return false
    }
  }, [tToast])

  const generate = useCallback(async (forceRegenerate = false) => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/v1/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      })

      if (!res.ok) {
        toast.error(tToast('theme.generate_failed'))
        return null
      }

      const json = await res.json()
      const created = json.data?.created ?? json.created ?? 0
      if (created > 0) {
        toast.success(`${created} temas gerados`)
      } else {
        toast.info(tToast('theme.no_new_themes'))
      }
      return { created }
    } catch {
      toast.error(tToast('theme.generate_failed'))
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [tToast])

  const scoreAll = useCallback(async () => {
    setIsScoringAll(true)
    try {
      const res = await fetch('/api/v1/themes/score-all', { method: 'POST' })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (res.status === 429 || body?.error?.includes('andamento')) {
          toast.warning(tToast('theme.recalc_in_progress'))
        } else {
          toast.error(tToast('theme.recalc_failed'))
        }
        return null
      }

      const json = await res.json()
      const data = json.data ?? json
      toast.success(`Scores atualizados em ${data.durationMs}ms`)
      return { updated: data.updated, durationMs: data.durationMs }
    } catch {
      toast.error(tToast('theme.recalc_failed'))
      return null
    } finally {
      setIsScoringAll(false)
    }
  }, [tToast])

  return { reject, restore, generate, scoreAll, isGenerating, isScoringAll }
}
