'use client'

// TASK-9 ST001 (CL-288): filtros da tabela de scraping audit.
// Filtros sao persistidos na URL via useSearchParams.

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

const STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED'] as const

export function AuditFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    startTransition(() => {
      router.replace(`?${next.toString()}`)
    })
  }

  return (
    <div
      data-testid="audit-filters"
      className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Status</span>
        <select
          value={params.get('status') ?? ''}
          onChange={(e) => setParam('status', e.target.value || null)}
          className="rounded-md border border-border bg-background px-2 py-1"
        >
          <option value="">Todos</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>De</span>
        <input
          type="date"
          value={params.get('from') ?? ''}
          onChange={(e) => setParam('from', e.target.value || null)}
          className="rounded-md border border-border bg-background px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Até</span>
        <input
          type="date"
          value={params.get('to') ?? ''}
          onChange={(e) => setParam('to', e.target.value || null)}
          className="rounded-md border border-border bg-background px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span>Source ID</span>
        <input
          type="text"
          defaultValue={params.get('sourceId') ?? ''}
          onBlur={(e) => setParam('sourceId', e.target.value.trim() || null)}
          placeholder="opcional"
          className="rounded-md border border-border bg-background px-2 py-1"
        />
      </label>

      {isPending && <span className="text-xs text-muted-foreground">atualizando...</span>}
    </div>
  )
}
