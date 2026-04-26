'use client'

// TASK-3 ST002 (CL-129) — Badge de reconciliacao no header.
// Consome `/api/v1/reconciliation/pending-count` (endpoint leve, ST001) com
// polling a cada 5 min. Renderiza somente quando count > 0.
// Tooltip mostra `lastRunAt` em formato local.

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 min

interface PendingCountPayload {
  success: boolean
  data: { count: number; lastRunAt: string | null }
}

interface HeaderReconciliationBadgeProps {
  locale: string
  /** Se presente, substitui o fetch interno (util para testes). */
  initialCount?: number
}

function formatLastRun(iso: string | null, locale: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function HeaderReconciliationBadge({
  locale,
  initialCount,
}: HeaderReconciliationBadgeProps) {
  const [count, setCount] = React.useState(initialCount ?? 0)
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null)
  const t = useTranslations('header')

  React.useEffect(() => {
    if (initialCount !== undefined) return // stubbed em testes
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/v1/reconciliation/pending-count', {
          credentials: 'include',
        })
        if (!res.ok || cancelled) return
        const json = (await res.json()) as PendingCountPayload
        if (cancelled) return
        setCount(json.data?.count ?? 0)
        setLastRunAt(json.data?.lastRunAt ?? null)
      } catch {
        // silencioso — badge e informativo
      }
    }

    void load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [initialCount])

  if (count <= 0) return null

  const tooltipText = lastRunAt
    ? `${t('reconciliationPending', { count })} — ${formatLastRun(lastRunAt, locale)}`
    : t('reconciliationPending', { count })

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/${locale}/analytics`}
            data-testid="reconciliation-badge"
            aria-label={t('reconciliationPending', { count })}
            className="relative flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
