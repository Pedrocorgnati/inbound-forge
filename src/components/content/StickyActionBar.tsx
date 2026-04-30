'use client'

import { CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StickyActionBarProps {
  onApprove: () => void
  onReject: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

/**
 * StickyActionBar — barra fixa de aprovacao/rejeicao para mobile (viewport < md).
 *
 * Renderiza dois botoes grandes (Aprovar / Rejeitar) ancorados no rodape com
 * safe-area-inset, z-40 e altura tocavel (>= 64px). Sempre oculto em md+ — o
 * desktop continua usando os botoes inline do `ApprovalPanel`.
 *
 * Atende REMEDIATION-M7-G-002 (TASK-10 mobile + I15) e MOBILE-GUIDE §3.5.
 */
export function StickyActionBar({
  onApprove,
  onReject,
  disabled = false,
  loading = false,
  className,
}: StickyActionBarProps) {
  const t = useTranslations('content.actions')

  return (
    <div
      data-testid="sticky-action-bar"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'border-t border-border bg-background',
        'px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]',
        'flex items-center gap-3 min-h-[64px]',
        'md:hidden',
        className
      )}
    >
      <Button
        onClick={onApprove}
        disabled={disabled || loading}
        isLoading={loading}
        className="h-12 flex-1"
        data-testid="sticky-action-bar-approve"
      >
        <CheckCircle className="h-4 w-4" />
        {t('approve')}
      </Button>

      <Button
        variant="outline"
        onClick={onReject}
        disabled={disabled || loading}
        className="h-12 flex-1"
        data-testid="sticky-action-bar-reject"
      >
        <XCircle className="h-4 w-4" />
        {t('reject')}
      </Button>
    </div>
  )
}
