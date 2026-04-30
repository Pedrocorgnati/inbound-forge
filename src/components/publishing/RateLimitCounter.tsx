'use client'

// TASK-15 ST005 (M11.6 UI / G-007) — Contador visivel de rate-limit Instagram.
// Polling 30s + revalidate manual. Cores tier-by-percentil. Toast aviso aos
// 80% (debounce 1h via localStorage). Bloqueia botao de publicar quando
// remaining === 0 via prop `onLimitReached`.

import * as React from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const REFRESH_INTERVAL_MS = 30_000
const WARN_THRESHOLD_PCT = 80
const WARN_DEBOUNCE_KEY = 'instagram_rate_limit_warned_at'
const WARN_DEBOUNCE_MS = 60 * 60 * 1000 // 1h — uma vez por janela

interface RateLimitPayload {
  used: number
  limit: number
  remaining: number
  resetsAt: string
  percentageUsed: number
  postsToday: number
  postsLimit: number
}

export interface RateLimitCounterProps {
  /** Chamado sempre que o contador atualiza (caller pode desabilitar UI). */
  onChange?: (status: { remaining: number; percentageUsed: number; canPublish: boolean }) => void
  /** Quando true, polling ativo. Pode ser desligado por caller (ex: tab oculto). */
  active?: boolean
  className?: string
}

function formatHourMinute(iso: string, now: Date = new Date()): string {
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return '--:--'
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return 'agora'
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `em ${minutes}min`
  const hh = String(target.getHours()).padStart(2, '0')
  const mm = String(target.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function colorByPercentile(pct: number): string {
  if (pct >= 100) return 'border-destructive bg-destructive/10 text-destructive'
  if (pct > 85) return 'border-destructive/60 bg-destructive/5 text-destructive'
  if (pct > 60) return 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return 'border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
}

export function RateLimitCounter({ onChange, active = true, className }: RateLimitCounterProps) {
  const [data, setData] = React.useState<RateLimitPayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/instagram/rate-limit', { method: 'GET', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      const payload = (body?.data ?? body) as RateLimitPayload
      setData(payload)
      setError(null)
      onChange?.({
        remaining: payload.remaining,
        percentageUsed: payload.percentageUsed,
        canPublish: payload.remaining > 0,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado'
      setError(message)
    }
  }, [onChange])

  // Polling
  React.useEffect(() => {
    if (!active) return
    fetchStatus()
    const id = window.setInterval(fetchStatus, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [active, fetchStatus])

  // Toast warn aos 80% — debounced 1h
  React.useEffect(() => {
    if (!data) return
    if (data.percentageUsed < WARN_THRESHOLD_PCT) return

    let lastWarnedAt = 0
    try {
      lastWarnedAt = Number(window.localStorage.getItem(WARN_DEBOUNCE_KEY) ?? '0')
    } catch {
      lastWarnedAt = 0
    }

    const now = Date.now()
    if (now - lastWarnedAt < WARN_DEBOUNCE_MS) return

    toast.warning(
      `Rate limit Instagram: ${data.percentageUsed}% usado (${data.used}/${data.limit} req nesta hora). Reset ${formatHourMinute(data.resetsAt)}.`,
    )
    try {
      window.localStorage.setItem(WARN_DEBOUNCE_KEY, String(now))
    } catch {
      /* noop */
    }
  }, [data])

  if (error && !data) {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground',
          className,
        )}
      >
        Rate limit indisponivel
      </span>
    )
  }

  if (!data) {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground',
          className,
        )}
      >
        Carregando rate limit…
      </span>
    )
  }

  const reachedLimit = data.remaining <= 0
  const tooltip = reachedLimit
    ? `Limite de ${data.limit} req/h atingido. Reseta ${formatHourMinute(data.resetsAt)}.`
    : `${data.used}/${data.limit} req nesta hora. Reset ${formatHourMinute(data.resetsAt)}.`

  return (
    <span
      role="status"
      aria-live="polite"
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium tabular-nums',
        colorByPercentile(data.percentageUsed),
        className,
      )}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {data.used}/{data.limit} req
      <span className="text-[10px] opacity-70">· reset {formatHourMinute(data.resetsAt)}</span>
    </span>
  )
}
