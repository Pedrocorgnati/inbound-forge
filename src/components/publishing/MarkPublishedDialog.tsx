'use client'

/**
 * Intake-Review TASK-6 (CL-312): dialog para operador registrar URL publicado
 * apos copiar caption/cta para LinkedIn/Instagram (modo assistido).
 */
import { useState, useCallback } from 'react'
import { z } from 'zod'
import { Loader2, X } from 'lucide-react'

const PublishedUrlSchema = z.object({
  publishedUrl: z.string().url('URL invalida').max(1024),
})

interface MarkPublishedDialogProps {
  postId: string
  open: boolean
  onClose: () => void
  onConfirmed?: (publishedUrl: string) => void
}

type SubmitState = 'idle' | 'submitting' | 'error'

export function MarkPublishedDialog({ postId, open, onClose, onConfirmed }: MarkPublishedDialogProps) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const parsed = PublishedUrlSchema.safeParse({ publishedUrl: url })
      if (!parsed.success) {
        setErrorMsg(parsed.error.issues[0]?.message ?? 'URL invalida')
        return
      }

      setState('submitting')
      setErrorMsg(null)

      try {
        const res = await fetch(`/api/v1/posts/${postId}/publish`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publishedUrl: parsed.data.publishedUrl }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `HTTP ${res.status}`)
        }
        onConfirmed?.(parsed.data.publishedUrl)
        setUrl('')
        setState('idle')
        onClose()
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao registrar')
        setState('error')
      }
    },
    [url, postId, onConfirmed, onClose],
  )

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-published-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="mark-published-title" className="text-lg font-semibold">
            Marcar como publicado
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Cole o URL do post publicado no LinkedIn ou Instagram. Isso registra a URL no historico
          e habilita o tracking de performance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="published-url" className="mb-1 block text-sm font-medium">
              URL do post publicado
            </label>
            <input
              id="published-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={state === 'submitting'}
            />
            {errorMsg && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={state === 'submitting'}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={state === 'submitting' || !url}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {state === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar publicacao
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
