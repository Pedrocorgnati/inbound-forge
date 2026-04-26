'use client'

// ExportThemesButton — dispara download do CSV respeitando filtros atuais
// Intake-Review TASK-8 ST002 (CL-TH-018).

import { useState } from 'react'

type Filters = {
  status?: string
  isNew?: string | boolean
  minScore?: number | string
  painCategory?: string
  niche?: string
  scoreMin?: number | string
  scoreMax?: number | string
  includeArchived?: boolean
}

type Props = {
  filters?: Filters
  className?: string
}

export function ExportThemesButton({ filters, className }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    setBusy(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
        }
      }
      const url = `/api/v1/themes/export${params.toString() ? `?${params}` : ''}`
      const a = document.createElement('a')
      a.href = url
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao exportar')
    } finally {
      // cooldown curto para evitar clique duplo acidental
      setTimeout(() => setBusy(false), 500)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded border bg-card px-3 py-1 text-sm hover:bg-muted/40 disabled:opacity-50"
        data-testid="themes-export-csv"
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
