'use client'

// LeadExportButton — dispara download do CSV respeitando filtros (TASK-6 ST003)

import { useState } from 'react'

type Filters = {
  status?: string
  funnelStage?: string
  channel?: string
  themeId?: string
  from?: string
  to?: string
  utmSource?: string
}

type Props = {
  filters?: Filters
  className?: string
}

export function LeadExportButton({ filters, className }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setBusy(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v) params.set(k, String(v))
        }
      }
      const url = `/api/v1/leads/export${params.toString() ? `?${params}` : ''}`
      // Triggers browser download via anchor
      const a = document.createElement('a')
      a.href = url
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao exportar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy}
        className="rounded border bg-card px-3 py-1 text-sm hover:bg-muted/40 disabled:opacity-50"
        data-testid="lead-export-csv"
      >
        {busy ? 'Preparando...' : 'Exportar CSV'}
      </button>
      {error && (
        <span role="alert" className="ml-2 text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
