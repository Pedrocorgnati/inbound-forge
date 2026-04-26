'use client'

// LeadStatusSelect — select inline para mudanca de status com confirmacao (TASK-6 ST003)
// Quando usuario seleciona LOST, dispara prop onLostRequest para abrir modal de motivo.

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'

export const LEAD_STATUSES = ['NEW', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'LOST'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

const LABELS: Record<LeadStatus, string> = {
  NEW: 'Novo',
  MQL: 'MQL',
  SQL: 'SQL',
  OPPORTUNITY: 'Oportunidade',
  CUSTOMER: 'Cliente',
  LOST: 'Perdido',
}

type Props = {
  leadId: string
  current: LeadStatus
  onChanged?: (next: LeadStatus) => void
  onLostRequest?: () => void
}

export function LeadStatusSelect({ leadId, current, onChanged, onLostRequest }: Props) {
  const [value, setValue] = useState<LeadStatus>(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const persist = async (next: LeadStatus) => {
    setBusy(true)
    setError(null)
    try {
      const res = await apiClient(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        setError(data?.message ?? `Falha (${res.status})`)
        setValue(current)
        return
      }
      setValue(next)
      onChanged?.(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de rede')
      setValue(current)
    } finally {
      setBusy(false)
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as LeadStatus
    if (next === 'LOST') {
      // Defer persistence to modal flow
      onLostRequest?.()
      return
    }
    void persist(next)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <select
        aria-label="Status do lead"
        value={value}
        onChange={onChange}
        disabled={busy}
        className="rounded border bg-card px-2 py-1 text-sm disabled:opacity-50"
        data-testid={`lead-status-${leadId}`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LABELS[s]}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
