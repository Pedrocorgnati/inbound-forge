'use client'

// WorkerControlPanel — grid de workers com status + acoes (TASK-7 ST005)

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { WorkerLogsStream } from './WorkerLogsStream'

const WORKERS = ['scraping', 'image', 'video', 'publishing'] as const
type WorkerId = (typeof WORKERS)[number]

const WORKER_LABELS: Record<WorkerId, string> = {
  scraping: 'Scraping',
  image: 'Imagem',
  video: 'Video',
  publishing: 'Publicacao',
}

type Toast = { kind: 'ok' | 'err'; msg: string } | null

export function WorkerControlPanel() {
  const [expanded, setExpanded] = useState<WorkerId | null>('scraping')
  const [toast, setToast] = useState<Toast>(null)
  const [busy, setBusy] = useState<{ [K in WorkerId]?: 'restart' | 'trigger' }>({})
  const [modal, setModal] = useState<{ worker: WorkerId; kind: 'restart' | 'trigger' } | null>(null)
  const [reason, setReason] = useState('')
  const [payloadText, setPayloadText] = useState('{}')

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  const doRestart = async (worker: WorkerId) => {
    setBusy((b) => ({ ...b, [worker]: 'restart' }))
    try {
      const res = await apiClient(`/api/workers/${worker}/restart`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string }
      if (!res.ok) {
        showToast({ kind: 'err', msg: data.message ?? `HTTP ${res.status}` })
      } else {
        showToast({ kind: 'ok', msg: `Worker ${WORKER_LABELS[worker]} reiniciado.` })
      }
    } catch (err) {
      showToast({ kind: 'err', msg: err instanceof Error ? err.message : 'erro' })
    } finally {
      setBusy((b) => ({ ...b, [worker]: undefined }))
      setModal(null)
      setReason('')
    }
  }

  const doTrigger = async (worker: WorkerId) => {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(payloadText || '{}')
    } catch {
      showToast({ kind: 'err', msg: 'JSON invalido no payload.' })
      return
    }
    setBusy((b) => ({ ...b, [worker]: 'trigger' }))
    try {
      const res = await apiClient(`/api/workers/${worker}/trigger`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload, reason: reason.trim() || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        correlationId?: string
        message?: string
      }
      if (!res.ok) {
        showToast({ kind: 'err', msg: data.message ?? `HTTP ${res.status}` })
      } else {
        showToast({ kind: 'ok', msg: `Trigger enfileirado. corrId=${data.correlationId}` })
      }
    } catch (err) {
      showToast({ kind: 'err', msg: err instanceof Error ? err.message : 'erro' })
    } finally {
      setBusy((b) => ({ ...b, [worker]: undefined }))
      setModal(null)
      setReason('')
      setPayloadText('{}')
    }
  }

  return (
    <section className="space-y-4" data-testid="worker-control-panel">
      <h2 className="text-lg font-semibold">Workers — operacao</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {WORKERS.map((w) => {
          const b = busy[w]
          return (
            <article key={w} className="rounded border bg-card p-4">
              <header className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{WORKER_LABELS[w]}</h3>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === w ? null : w)}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  {expanded === w ? 'Ocultar logs' : 'Ver logs'}
                </button>
              </header>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!b}
                  onClick={() => setModal({ worker: w, kind: 'restart' })}
                  className="rounded border px-3 py-1 text-sm hover:bg-muted/40 disabled:opacity-50"
                >
                  {b === 'restart' ? 'Reiniciando...' : 'Reiniciar'}
                </button>
                <button
                  type="button"
                  disabled={!!b}
                  onClick={() => setModal({ worker: w, kind: 'trigger' })}
                  className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {b === 'trigger' ? 'Disparando...' : 'Rodar agora'}
                </button>
              </div>

              {expanded === w && (
                <div className="mt-3">
                  <WorkerLogsStream worker={w} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 rounded px-4 py-2 text-sm shadow ${
            toast.kind === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setModal(null)
          }}
        >
          <div className="w-full max-w-md rounded bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">
              {modal.kind === 'restart' ? 'Reiniciar worker' : 'Rodar worker agora'} —{' '}
              {WORKER_LABELS[modal.worker]}
            </h3>

            {modal.kind === 'trigger' && (
              <div className="mb-3">
                <label htmlFor="payload" className="mb-1 block text-sm font-medium">
                  Payload (JSON)
                </label>
                <textarea
                  id="payload"
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  rows={4}
                  className="w-full rounded border p-2 font-mono text-xs"
                />
              </div>
            )}

            <label htmlFor="reason" className="mb-1 block text-sm font-medium">
              Motivo (opcional)
            </label>
            <input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="w-full rounded border px-2 py-1 text-sm"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal(null)
                  setReason('')
                  setPayloadText('{}')
                }}
                className="rounded border px-3 py-1 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modal.kind === 'restart') void doRestart(modal.worker)
                  else void doTrigger(modal.worker)
                }}
                className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
