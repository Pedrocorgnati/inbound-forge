'use client'

// LeadLossReasonModal — captura motivo estruturado quando lead vai para LOST (TASK-6 ST004 / CL-244)

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export const LOSS_REASONS = ['BUDGET', 'TIMING', 'FIT', 'NO_RESPONSE', 'COMPETITOR', 'OTHER'] as const
type LossReason = (typeof LOSS_REASONS)[number]

const REASON_LABELS: Record<LossReason, string> = {
  BUDGET: 'Orcamento insuficiente',
  TIMING: 'Timing inadequado',
  FIT: 'Sem fit com a oferta',
  NO_RESPONSE: 'Sem resposta',
  COMPETITOR: 'Foi para concorrente',
  OTHER: 'Outro',
}

type Props = {
  open: boolean
  leadId: string
  onClose: () => void
  onSuccess: () => void
}

export function LeadLossReasonModal({ open, leadId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState<LossReason | ''>('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setDetail('')
      setError(null)
      setTimeout(() => selectRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const valid = reason.length > 0

  const submit = async () => {
    if (!valid) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiClient(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'LOST',
          lossReason: reason,
          lossReasonDetail: detail.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) {
        setError(data?.message ?? `Falha (${res.status})`)
        return
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de rede')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="loss-reason-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded bg-white p-5 shadow-xl">
        <h2 id="loss-reason-title" className="mb-2 text-lg font-semibold">
          Motivo da perda
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Selecione o motivo principal. Use o campo de detalhe para contexto adicional.
        </p>

        <label htmlFor="loss-reason" className="mb-1 block text-sm font-medium">
          Motivo *
        </label>
        <select
          id="loss-reason"
          ref={selectRef}
          value={reason}
          onChange={(e) => setReason(e.target.value as LossReason)}
          className="mb-3 w-full rounded border px-2 py-2 text-sm"
          data-testid="loss-reason-select"
        >
          <option value="">Selecione...</option>
          {LOSS_REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABELS[r]}
            </option>
          ))}
        </select>

        <label htmlFor="loss-detail" className="mb-1 block text-sm font-medium">
          Detalhe (opcional, max 500)
        </label>
        <textarea
          id="loss-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded border p-2 text-sm"
          data-testid="loss-detail"
        />
        <div className="mt-1 text-xs text-muted-foreground">{detail.length}/500</div>

        {error && (
          <div role="alert" className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border px-3 py-1 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!valid || submitting}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            data-testid="loss-reason-confirm"
          >
            {submitting ? 'Salvando...' : 'Confirmar perda'}
          </button>
        </div>
      </div>
    </div>
  )
}
