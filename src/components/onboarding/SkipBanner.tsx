'use client'

// CL-249 (TASK-12 ST003) — Banner persistente para users que pularam o onboarding.
// Aparece quando onboarding_skipped_at setado e onboarding_completed_at null.
// Dismissavel via localStorage + server flag.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { STORAGE_KEYS } from '@/constants/storage-keys'

const DISMISS_KEY = STORAGE_KEYS.ONBOARDING_SKIP_BANNER_DISMISSED

interface SkipBannerProps {
  locale: string
  isSkipped: boolean       // onboarding_skipped_at != null
  isCompleted: boolean     // onboarding_completed_at != null || onboardingCompleted
}

export function SkipBanner({ locale, isSkipped, isCompleted }: SkipBannerProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isSkipped || isCompleted) return
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    setVisible(!dismissed)
  }, [isSkipped, isCompleted])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }, [])

  const handleComplete = useCallback(() => {
    router.push(`/${locale}/onboarding`)
  }, [router, locale])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200"
    >
      <span>
        Voce ainda nao completou o onboarding.{' '}
        <button
          type="button"
          onClick={handleComplete}
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Completar agora
        </button>{' '}
        para desbloquear todas as funcionalidades.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded p-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
