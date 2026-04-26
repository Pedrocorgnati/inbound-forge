'use client'

// Intake-Review TASK-17 ST001 (CL-PB-056): aviso SEO ao despublicar artigo.
// Separado de blog-admin/RollbackConfirmModal (version rollback, distinto de unpublish).

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleId: string
  articleTitle?: string
  slug: string
  onUnpublished?: () => void
}

export function BlogArticleUnpublishDialog({
  open,
  onOpenChange,
  articleId,
  articleTitle,
  slug,
  onUnpublished,
}: Props) {
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!ack || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/blog-articles/${articleId}/unpublish`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error ?? `Falha (${res.status})`)
      }
      toast.success('Artigo despublicado')
      onUnpublished?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">Despublicar artigo?</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {articleTitle ? `"${articleTitle}"` : 'Este artigo'} sera removido da listagem publica.
          </Dialog.Description>

          <div
            role="alert"
            className="mt-4 space-y-1 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
          >
            <p className="font-semibold">Impacto SEO — leia antes de confirmar</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                A URL{' '}
                <code className="rounded bg-background px-1 py-0.5 font-mono">/blog/{slug}</code>{' '}
                passa a responder <strong>410 Gone</strong>.
              </li>
              <li>
                O sitemap remove esta entrada na proxima revalidacao (ate 24h).
              </li>
              <li>
                Backlinks externos que apontam para esta URL ficam quebrados.
              </li>
              <li>
                O slug fica reservado internamente — reuso requer republicar com mesmo slug.
              </li>
            </ul>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              data-testid="unpublish-ack"
            />
            Entendo o impacto SEO e quero despublicar mesmo assim.
          </label>

          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!ack || busy}
              onClick={() => void handleConfirm()}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              data-testid="unpublish-confirm"
            >
              {busy ? 'Despublicando...' : 'Despublicar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
