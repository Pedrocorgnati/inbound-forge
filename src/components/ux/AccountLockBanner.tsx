'use client'

import { AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type LockReason = 'invalid_credentials' | 'usage_limit' | null

interface AccountLockBannerProps {
  reason: LockReason
  onAction: () => void
}

const VARIANTS: Record<
  NonNullable<LockReason>,
  {
    icon: typeof AlertTriangle
    message: string
    actionLabel: string
    bg: string
    border: string
    text: string
  }
> = {
  invalid_credentials: {
    icon: AlertTriangle,
    message: 'Credenciais invalidas. Atualize nas configuracoes.',
    actionLabel: 'Atualizar credenciais',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  usage_limit: {
    icon: XCircle,
    message: 'Limite de uso atingido. Verifique o consumo de API.',
    actionLabel: 'Ver consumo',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-200',
  },
}

export function AccountLockBanner({ reason, onAction }: AccountLockBannerProps) {
  if (!reason) return null

  const variant = VARIANTS[reason]
  const Icon = variant.icon

  return (
    <div
      data-testid="account-lock-banner"
      role="alert"
      className={cn(
        'sticky top-16 z-40 flex items-center justify-between gap-3 border-b px-4 py-2.5',
        variant.bg,
        variant.border,
        variant.text
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span>{variant.message}</span>
      </div>
      <Button
        data-testid="account-lock-action"
        variant="outline"
        size="sm"
        onClick={onAction}
        className={cn('shrink-0 border-current', variant.text)}
      >
        {variant.actionLabel}
      </Button>
    </div>
  )
}
