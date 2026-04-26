'use client'

// RejectionInsightsPanel — top motivos de rejeicao para feedback loop
// Intake-Review TASK-13 ST003 (CL-CS-037).

import { useEffect, useState } from 'react'

type Bucket = {
  reason?: string | null
  angle?: string | null
  count: number
  lastAt: string | null
}

type Props = {
  groupBy?: 'reason' | 'angle'
  from?: string
  to?: string
  limit?: number
  className?: string
}

export function RejectionInsightsPanel({
  groupBy = 'reason',
  from,
  to,
  limit = 10,
  className,
}: Props) {
  const [items, setItems] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ groupBy, limit: String(limit) })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    fetch(`/api/v1/content/rejections/aggregate?${params}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json?.error ?? 'Falha ao carregar')
        return (json.data ?? []) as Bucket[]
      })
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupBy, from, to, limit])

  const max = items.reduce((acc, i) => Math.max(acc, i.count), 1)

  return (
    <section className={className} data-testid="rejection-insights">
      <header className="border-b pb-2">
        <h2 className="text-sm font-semibold">Motivos de rejeicao — top {limit}</h2>
      </header>
      {loading && <p className="mt-3 text-xs text-muted-foreground">Carregando...</p>}
      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Nenhuma rejeicao no periodo.</p>
      )}
      {!loading && items.length > 0 && (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((b, i) => {
            const label = (groupBy === 'reason' ? b.reason : b.angle) ?? '(sem motivo)'
            const pct = Math.round((b.count / max) * 100)
            return (
              <li key={`${label}-${i}`} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="truncate" title={label}>
                    {label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{b.count}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-muted/30" aria-hidden="true">
                  <div
                    className="h-full rounded bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
