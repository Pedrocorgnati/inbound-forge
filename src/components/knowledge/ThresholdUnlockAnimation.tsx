'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

interface ThresholdUnlockAnimationProps {
  isVisible: boolean
  onDismiss: () => void
  locale: string
}

export function ThresholdUnlockAnimation({
  isVisible,
  onDismiss,
  locale,
}: ThresholdUnlockAnimationProps) {
  const router = useRouter()

  // Show toast when visible
  useEffect(() => {
    if (isVisible) {
      toast.success('Base de conhecimento desbloqueada!')
    }
  }, [isVisible])

  // Dismiss via Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    },
    [onDismiss]
  )

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, handleKeyDown])

  if (!isVisible) return null

  function handleNavigate() {
    onDismiss()
    router.push(`/${locale}/dashboard`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 motion-reduce:animate-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
      data-testid="threshold-unlock-animation"
    >
      <div className="w-[90vw] max-w-[420px] rounded-lg border border-success/30 bg-background p-8 text-center shadow-xl motion-reduce:animate-none animate-in zoom-in-95 fade-in duration-300">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2
          id="unlock-title"
          className="text-xl font-semibold text-foreground"
        >
          Base de conhecimento desbloqueada!
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O motor de temas está pronto para análise.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={handleNavigate} data-testid="unlock-go-themes">
            Ir para Temas
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Continuar aqui
          </Button>
        </div>
      </div>
    </div>
  )
}
