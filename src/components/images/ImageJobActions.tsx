'use client'

// ImageJobActions — botoes contextuais (Retry, Cancel) para ImageJob
// Intake-Review TASK-12 ST005 (CL-CG-008/009).

import { useState } from 'react'

type Props = {
  jobId: string
  status: string
  onUpdated?: (status: string) => void
  className?: string
}

export function ImageJobActions({ jobId, status, onUpdated, className }: Props) {
  const [busy, setBusy] = useState<'retry' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canRetry = status === 'FAILED'
  const canCancel = status === 'PENDING' || status === 'RUNNING'

  const post = async (kind: 'retry' | 'cancel') => {
    if (!confirm(kind === 'retry' ? 'Reexecutar este job?' : 'Cancelar este job?')) return
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch(`/api/v1/images/${jobId}/${kind}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Falha ao ${kind}`)
      onUpdated?.(json.data?.status ?? json.status ?? status)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Falha ao ${kind}`)
    } finally {
      setBusy(null)
    }
  }

  if (!canRetry && !canCancel) return null

  return (
    <div className={className} data-testid="image-job-actions">
      {canRetry && (
        <button
          type="button"
          onClick={() => void post('retry')}
          disabled={busy !== null}
          className="mr-2 rounded border bg-card px-2 py-1 text-xs hover:bg-muted/40 disabled:opacity-50"
          data-testid="image-job-retry"
        >
          {busy === 'retry' ? 'Reexecutando...' : 'Retry'}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={() => void post('cancel')}
          disabled={busy !== null}
          className="rounded border bg-card px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
          data-testid="image-job-cancel"
        >
          {busy === 'cancel' ? 'Cancelando...' : 'Cancelar'}
        </button>
      )}
      {error && (
        <span role="alert" className="ml-2 text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
