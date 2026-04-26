'use client'

// AlertLogFilters — filtro type + severity para AlertLog, persiste via URL.
// Intake-Review TASK-21 ST004 (CL-DX-027).

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'queue_length', label: 'Fila' },
  { value: 'dead_letter', label: 'Dead-letter' },
  { value: 'worker_down', label: 'Worker down' },
  { value: 'redis_unreachable', label: 'Redis' },
  { value: 'db_unreachable', label: 'DB' },
  { value: 'health_check', label: 'Health check' },
]

const SEVERITY_OPTIONS = [
  { value: '', label: 'Todas severidades' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
]

const RESOLVED_OPTIONS = [
  { value: 'false', label: 'Abertos' },
  { value: 'true', label: 'Resolvidos' },
]

export function AlertLogFilters({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [severity, setSeverity] = useState(searchParams.get('severity') ?? '')
  const [resolved, setResolved] = useState(searchParams.get('resolved') ?? 'false')

  useEffect(() => {
    setType(searchParams.get('type') ?? '')
    setSeverity(searchParams.get('severity') ?? '')
    setResolved(searchParams.get('resolved') ?? 'false')
  }, [searchParams])

  const apply = (next: { type?: string; severity?: string; resolved?: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    const map = { type, severity, resolved, ...next }
    for (const [k, v] of Object.entries(map)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className={className} data-testid="alert-log-filters">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs">
          Tipo
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              apply({ type: e.target.value })
            }}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="alert-filters-type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Severidade
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value)
              apply({ severity: e.target.value })
            }}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="alert-filters-severity"
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Status
          <select
            value={resolved}
            onChange={(e) => {
              setResolved(e.target.value)
              apply({ resolved: e.target.value })
            }}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="alert-filters-resolved"
          >
            {RESOLVED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
