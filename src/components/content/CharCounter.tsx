'use client'

import { cn } from '@/lib/utils'

interface CharCounterProps {
  current: number
  limit: number
  id?: string
  className?: string
}

export function CharCounter({ current, limit, id, className }: CharCounterProps) {
  const isUnlimited = !isFinite(limit)
  const ratio = isUnlimited ? 0 : current / limit

  const colorClass = isUnlimited
    ? 'text-muted-foreground'
    : ratio > 1
      ? 'text-[#991B1B] font-medium'
      : ratio >= 0.8
        ? 'text-[#92400E] font-medium'
        : 'text-muted-foreground'

  const limitText = isUnlimited ? 'sem limite' : `${limit}`

  return (
    <span
      id={id}
      role="status"
      aria-live="polite"
      className={cn('text-xs', colorClass, className)}
      data-testid="char-counter"
    >
      {current} de {limitText} caracteres
    </span>
  )
}
