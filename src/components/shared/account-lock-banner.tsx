'use client'

import React, { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

interface AccountLockBannerProps {
  ttlSeconds: number
  onUnlock?: () => void
}

export function AccountLockBanner({ ttlSeconds, onUnlock }: AccountLockBannerProps) {
  const [remaining, setRemaining] = useState(ttlSeconds)

  useEffect(() => {
    if (remaining <= 0) {
      onUnlock?.()
      return
    }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onUnlock?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-md border-l-4 border-danger bg-danger/5 p-4"
    >
      <Lock className="h-5 w-5 shrink-0 text-danger mt-0.5" aria-hidden />
      <div className="text-sm text-danger">
        <span className="font-medium">Conta bloqueada.</span>{' '}
        Tente novamente em{' '}
        <span aria-live="off" className="font-mono font-semibold">
          {formatted}
        </span>
      </div>
    </div>
  )
}
