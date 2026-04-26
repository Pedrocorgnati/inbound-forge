'use client'

/**
 * PostDetailPanel — Intake Review TASK-12 ST004 (CL-244).
 * Side drawer que abre ao clicar em um PostMiniCard no calendario.
 * MVP: dialog modal acessivel por teclado (ESC fecha). Drag-in/out animado pode ser
 * adicionado via Radix Sheet em iteracao futura.
 */
import { useEffect } from 'react'
import Link from 'next/link'
import { X, Calendar as CalendarIcon, Globe, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PostDetail {
  id: string
  themeId?: string | null
  angle?: string | null
  channel?: string | null
  status?: string | null
  scheduledFor?: string | Date | null
  imageUrl?: string | null
  title?: string | null
}

interface Props {
  post: PostDetail | null
  open: boolean
  onClose: () => void
  onPause?: (postId: string) => void | Promise<void>
  onRemove?: (postId: string) => void | Promise<void>
  onDownload?: (postId: string) => void | Promise<void>
}

export function PostDetailPanel({ post, open, onClose, onPause, onRemove, onDownload }: Props) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open || !post) return null

  const scheduled = post.scheduledFor
    ? new Date(post.scheduledFor).toLocaleString()
    : 'nao agendado'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do post"
      data-testid="post-detail-panel"
      className="fixed inset-0 z-50 flex items-stretch justify-end"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <aside
        className={cn(
          'relative z-10 flex w-full max-w-md flex-col overflow-y-auto',
          'bg-surface border-l border-border shadow-xl',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{post.title ?? 'Detalhes do post'}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 px-4 py-4 text-sm">
          {post.imageUrl && (
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt={post.title ?? 'Preview do post'}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" aria-hidden />
              Canal
            </dt>
            <dd>{post.channel ?? '—'}</dd>

            <dt className="text-muted-foreground">Angulo</dt>
            <dd>{post.angle ?? '—'}</dd>

            <dt className="text-muted-foreground">Status</dt>
            <dd>{post.status ?? '—'}</dd>

            <dt className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
              Agendado
            </dt>
            <dd>{scheduled}</dd>
          </dl>

          {post.themeId && (
            <Link
              href={`/themes/${post.themeId}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Ver tema origem
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {onPause && (
            <button
              type="button"
              onClick={() => onPause(post.id)}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              Pausar
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={() => onDownload(post.id)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
              Baixar
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(post.id)}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              Remover
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}
