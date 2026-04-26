'use client'

/**
 * TASK-10/ST002 (CL-216) — Painel de rate-limit por integracao.
 */
import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface ProviderLimit {
  provider: string
  used: number
  limit: number
  resetAt: string
  status: 'ok' | 'warn' | 'critical'
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

function barColor(status: ProviderLimit['status']): string {
  if (status === 'critical') return 'bg-red-500'
  if (status === 'warn') return 'bg-amber-500'
  return 'bg-green-500'
}

export function RateLimitPanel() {
  const t = useTranslations('rateLimits')
  const { data } = useSWR<{ data: ProviderLimit[] }>(
    '/api/v1/integrations/rate-limits',
    fetcher,
    { refreshInterval: 60_000 }
  )

  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.data) return
    for (const row of data.data) {
      if (row.status === 'critical') {
        const key = `${row.provider}:${row.resetAt}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          toast.error(t('criticalToast', { provider: row.provider }))
        }
      }
    }
  }, [data, t])

  const rows = data?.data ?? []

  return (
    <section className="rounded-lg border border-border p-4" data-testid="rate-limit-panel">
      <h3 className="mb-3 text-sm font-semibold">{t('title')}</h3>
      <ul className="space-y-2">
        {rows.map((row) => {
          const pct = Math.min(100, row.limit > 0 ? (row.used / row.limit) * 100 : 0)
          return (
            <li key={row.provider}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium capitalize">{row.provider}</span>
                <span
                  className="text-muted-foreground"
                  title={`${t('resetAt')}: ${new Date(row.resetAt).toLocaleString()}`}
                >
                  {row.used} / {row.limit}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className={`h-full ${barColor(row.status)}`}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
