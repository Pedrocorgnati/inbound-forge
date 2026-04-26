'use client'

// Intake-Review TASK-17 ST002 (CL-PB-057): delete hard de artigo com aviso
// de slug reservado 90 dias. Type-to-confirm DELETAR + ack SEO.

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleId: string
  articleTitle?: string
  slug: string
  onDeleted?: () => void
}

const CONFIRM_PHRASE = 'DELETAR'

export function BlogArticleDeleteDialog({
  open,
  onOpenChange,
  articleId,
  articleTitle,
  slug,
  onDeleted,
}: Props) {
  const [ack, setAck] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = ack && input === CONFIRM_PHRASE && !busy

  const handleConfirm = async () => {
    if (!canConfirm) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/blog-articles/${articleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error ?? `Falha (${res.status})`)
      }
      toast.success('Artigo excluido')
      onDeleted?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (busy) return
        onOpenChange(v)
        if (!v) {
          setAck(false)
          setInput('')
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-destructive">
            Excluir artigo permanentemente?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {articleTitle ? `"${articleTitle}"` : 'Este artigo'} sera removido do BD e do
            sitemap. Esta acao e irreversivel.
          </Dialog.Description>

          <div
            role="alert"
            className="mt-4 space-y-1 rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <p className="font-semibold">Aviso SEO</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                O slug{' '}
                <code className="rounded bg-background px-1 py-0.5 font-mono">/blog/{slug}</code>{' '}
                fica <strong>reservado por 90 dias</strong> para impedir reuso e redirecionamento
                confuso para conteudo distinto.
              </li>
              <li>
                A URL passa a responder <strong>410 Gone</strong>.
              </li>
              <li>
                Sitemap e feeds RSS removem a entrada na proxima revalidacao.
              </li>
              <li>Backlinks externos ficam quebrados permanentemente.</li>
            </ul>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              data-testid="delete-article-ack"
            />
            Entendo o impacto SEO e a reserva de slug.
          </label>

          <label className="mt-3 block text-xs font-medium">
            Digite{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">{CONFIRM_PHRASE}</code> para
            habilitar:
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              data-testid="delete-article-type"
            />
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
              disabled={!canConfirm}
              onClick={() => void handleConfirm()}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              data-testid="delete-article-confirm"
            >
              {busy ? 'Excluindo...' : 'Excluir permanentemente'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
