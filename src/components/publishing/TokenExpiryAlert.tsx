'use client'

// TASK-13 ST004 (M11.7 / G-003) — banner global de alerta de expiracao do
// token Instagram. Tier por severity (info=30d, warning=15d, critical=7d).
// Consulta /api/instagram/status (que retorna tokenStatus tiered desde TASK-13
// ST002). Polling a cada 30 minutos. Dismissivel por sessao (per-tier).

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TokenAlertSeverity } from '@/lib/constants/publishing'

const POLL_INTERVAL_MS = 30 * 60 * 1000 // 30min — token expira em dias, nao precisa polling agressivo
const DISMISS_KEY = 'instagram_token_alert_dismissed'

interface TokenStatusPayload {
  daysUntilExpiry: number
  isExpired: boolean
  needsRefresh: boolean
  severity: TokenAlertSeverity
  hasWarning: boolean
  warningMessage: string | null
}

interface InstagramStatusPayload {
  configured: boolean
  tokenExpiry: TokenStatusPayload | null
}

const SEVERITY_STYLES: Record<Exclude<TokenAlertSeverity, 'none'>, { wrapper: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  info: {
    wrapper: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
    icon: Info,
    label: 'Aviso',
  },
  warning: {
    wrapper: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    icon: AlertTriangle,
    label: 'Atencao',
  },
  critical: {
    wrapper: 'border-destructive/60 bg-destructive/10 text-destructive dark:bg-destructive/20',
    icon: AlertCircle,
    label: 'Urgente',
  },
}

function readDismissedSeverity(): TokenAlertSeverity | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.sessionStorage.getItem(DISMISS_KEY)
    return (v === 'info' || v === 'warning' || v === 'critical') ? v : null
  } catch {
    return null
  }
}

function persistDismissed(sev: TokenAlertSeverity) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(DISMISS_KEY, sev) } catch { /* noop */ }
}

export interface TokenExpiryAlertProps {
  className?: string
}

export function TokenExpiryAlert({ className }: TokenExpiryAlertProps) {
  const [status, setStatus] = React.useState<TokenStatusPayload | null>(null)
  const [dismissed, setDismissed] = React.useState<TokenAlertSeverity | null>(() => readDismissedSeverity())

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/instagram/status', { cache: 'no-store' })
      if (!res.ok) return
      const body = await res.json().catch(() => null)
      const payload = (body?.data ?? body) as InstagramStatusPayload | null
      const tokenStatus = payload?.tokenExpiry ?? null
      setStatus(tokenStatus)
      // Se severity escalou (ex: warning → critical), reseta dismissal anterior.
      if (tokenStatus && tokenStatus.severity !== 'none') {
        const prev = dismissed
        if (prev && prev !== tokenStatus.severity) {
          setDismissed(null)
          try { window.sessionStorage.removeItem(DISMISS_KEY) } catch { /* noop */ }
        }
      }
    } catch {
      /* fail-safe: silencioso */
    }
  }, [dismissed])

  React.useEffect(() => {
    fetchStatus()
    const id = window.setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [fetchStatus])

  if (!status || status.severity === 'none') return null
  if (dismissed === status.severity) return null

  const styles = SEVERITY_STYLES[status.severity]
  const Icon = styles.icon

  function handleDismiss() {
    if (!status) return
    setDismissed(status.severity)
    persistDismissed(status.severity)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-sm',
        styles.wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">
          {styles.label}: {status.warningMessage ?? `Token Instagram expira em ${status.daysUntilExpiry} dias.`}
        </p>
        <Link
          href="/health"
          className="mt-1 inline-block text-xs font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded-sm"
        >
          Fazer refresh agora
        </Link>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar alerta nesta sessao"
        className="rounded-sm p-1 hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
