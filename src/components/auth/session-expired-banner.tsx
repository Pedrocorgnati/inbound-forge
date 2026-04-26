'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionExpiredBannerProps {
  variant: 'expiring' | 'expired'
  expiresAt?: Date
  onRenew?: () => Promise<void>
  onDismiss?: () => void
  locale?: string
}

export function SessionExpiredBanner({
  variant,
  expiresAt,
  onRenew,
  onDismiss,
  locale = 'pt-BR',
}: SessionExpiredBannerProps) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return variant === 'expired' ? 5 : 300
    return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  })
  const [isRenewing, setIsRenewing] = useState(false)

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1)
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-redirect on expired when countdown reaches 0
  useEffect(() => {
    if (variant === 'expired' && secondsLeft === 0) {
      router.push(`/${locale}/login?error=SessionExpired`)
    }
  }, [variant, secondsLeft, router, locale])

  const handleRenew = useCallback(async () => {
    if (!onRenew) return
    setIsRenewing(true)
    try {
      await onRenew()
    } finally {
      setIsRenewing(false)
    }
  }, [onRenew])

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const isExpiring = variant === 'expiring'
  const isExpired = variant === 'expired'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col sm:flex-row items-center gap-3 px-4 py-3 pb-[env(safe-area-inset-bottom)] text-sm shadow-lg', // RESOLVED: FE-013 — safe-area-inset-bottom para iPhone home bar
        isExpiring && 'bg-yellow-50 border-t border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
        isExpired && 'bg-red-50 border-t border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100'
      )}
    >
      <div className="flex items-center gap-2 flex-1">
        {isExpiring ? (
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <p>
          {isExpiring
            ? 'Sua sessão expira em '
            : 'Sessão expirada. Redirecionando em '}
          <span aria-live="off" className="font-mono font-semibold">
            {formatTime(secondsLeft)}
          </span>
          {isExpiring && '. Deseja continuar conectado?'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isExpiring && onRenew && (
          <Button
            size="sm"
            variant="default"
            className="min-h-[44px] sm:min-h-[36px]"
            onClick={handleRenew}
            disabled={isRenewing}
          >
            {isRenewing ? 'Renovando...' : 'Continuar conectado'}
          </Button>
        )}

        {isExpired && (
          <Button
            size="sm"
            variant="default"
            className="min-h-[44px] sm:min-h-[36px]"
            onClick={() => router.push(`/${locale}/login`)}
          >
            Fazer login novamente
          </Button>
        )}

        {onDismiss && isExpiring && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar aviso"
            className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
