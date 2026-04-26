'use client'

// Intake Review TASK-7 ST003 (CL-028) — banner de nudge contextual reutilizavel.
// Persiste o dismiss em localStorage (`nudge-dismissed-{id}`). Componente puro
// do lado do cliente — exibe children/text + acao opcional.

import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface NudgeBannerProps {
  id: string
  text: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  variant?: 'info' | 'warning' | 'success'
  className?: string
  /** Se true, ignora o localStorage (sempre visivel). */
  persistent?: boolean
}

const STORAGE_PREFIX = 'nudge-dismissed-'

function readDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id) === 'true'
  } catch {
    return false
  }
}

function writeDismissed(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, 'true')
  } catch {
    // noop
  }
}

const VARIANT_CLASS: Record<NonNullable<NudgeBannerProps['variant']>, string> = {
  info: 'border-info/30 bg-info/5 text-info-foreground',
  warning: 'border-warning/40 bg-warning/5 text-warning-foreground',
  success: 'border-success/30 bg-success/5 text-success-foreground',
}

export function NudgeBanner({
  id,
  text,
  actionLabel,
  onAction,
  variant = 'info',
  className,
  persistent = false,
}: NudgeBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!persistent && readDismissed(id)) setDismissed(true)
  }, [id, persistent])

  if (!mounted || dismissed) return null

  const dismiss = () => {
    if (!persistent) writeDismissed(id)
    setDismissed(true)
  }

  return (
    <div
      role="status"
      data-testid="nudge-banner"
      data-nudge-id={id}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${VARIANT_CLASS[variant]} ${
        className ?? ''
      }`}
    >
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1 text-foreground">{text}</div>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {!persistent && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Descartar sugestão"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
