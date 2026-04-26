'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'

const MIN_REASON = 10

type Props = {
  postId: string
  postPreview: { caption: string; imageUrl?: string | null }
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RollbackConfirmModal({ postId, postPreview, open, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
      setTimeout(() => textareaRef.current?.focus(), 0)
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

  const valid = reason.trim().length >= MIN_REASON

  const submit = async () => {
    if (!valid) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiClient(`/api/v1/posts/${postId}/rollback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || `Falha (${res.status})`)
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
      aria-labelledby="rollback-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-lg rounded bg-white p-5 shadow-xl">
        <h2 id="rollback-title" className="mb-2 text-lg font-semibold text-red-700">
          Reverter publicacao
        </h2>
        <p className="mb-3 text-sm text-gray-700">
          Esta acao removera o post do canal publicado e marcara como ROLLED_BACK. Conversoes ja
          atribuidas permanecem no historico.
        </p>

        <details className="mb-3 rounded border bg-gray-50 p-2 text-sm">
          <summary className="cursor-pointer font-medium">Preview do post</summary>
          {postPreview.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={postPreview.imageUrl} alt="" className="mt-2 max-h-40 rounded" />
          )}
          <p className="mt-2 whitespace-pre-wrap">{postPreview.caption}</p>
        </details>

        <label htmlFor="rollback-reason" className="mb-1 block text-sm font-medium">
          Motivo (obrigatorio, minimo {MIN_REASON} caracteres)
        </label>
        <textarea
          id="rollback-reason"
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded border p-2 text-sm"
          maxLength={500}
          data-testid="rollback-reason"
        />
        <div className="mt-1 text-xs text-gray-500">
          {reason.trim().length}/{MIN_REASON} minimo · {reason.length}/500
        </div>

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
            data-testid="rollback-confirm"
          >
            {submitting ? 'Revertendo...' : 'Confirmar reversao'}
          </button>
        </div>
      </div>
    </div>
  )
}
