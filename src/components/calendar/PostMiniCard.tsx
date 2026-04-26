'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MoreHorizontal, GripVertical, Instagram, Linkedin, Pause, Play, Download, Trash2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/lib/i18n/formatters'
import { ChannelBadge } from '@/components/publishing/ChannelBadge'
import { QueueStatusBadge } from '@/components/publishing/QueueStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { PublishingPost } from '@/types/publishing'

interface PostMiniCardProps {
  post: PublishingPost
  compact?: boolean
  dragAttributes?: Record<string, unknown>
  dragListeners?: Record<string, unknown>
  isDragging?: boolean
  /** Callback opcional quando item muda (pausar/retomar/remover). */
  onChanged?: () => void
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-4 w-4 text-pink-500" />,
  LINKEDIN: <Linkedin className="h-4 w-4 text-blue-600" />,
}

// RESOLVED: G002 — useFormatters usa locale dinâmico em vez de 'pt-BR' hardcoded
export function PostMiniCard({
  post,
  compact = false,
  dragAttributes,
  dragListeners,
  isDragging = false,
  onChanged,
}: PostMiniCardProps) {
  const fmt = useFormatters()
  const truncatedCaption =
    post.caption.length > 40 ? post.caption.slice(0, 40) + '...' : post.caption

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const isPaused = post.queueStatus === 'PAUSED'
  const canAct = Boolean(post.queueId) && post.status !== 'PUBLISHED'

  async function togglePause() {
    if (!post.queueId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/publishing-queue/${post.queueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: isPaused ? 'PENDING' : 'PAUSED' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(isPaused ? 'Retomado' : 'Pausado')
      onChanged?.()
    } catch {
      toast.error('Falha ao atualizar item')
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!post.queueId) return
    window.open(`/api/v1/publishing-queue/${post.queueId}/download`, '_blank')
  }

  async function remove() {
    if (!post.queueId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/publishing-queue/${post.queueId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.status === 409) {
        toast.error('Item ja publicado nao pode ser removido')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      toast.success('Removido da fila')
      onChanged?.()
    } catch {
      toast.error('Falha ao remover')
    } finally {
      setBusy(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div
      role="article"
      aria-label={`Post: ${post.caption}, Canal: ${post.channel}, Status: ${post.status}`}
      className={cn(
        'group relative flex min-h-[44px] items-start gap-2 rounded-md border border-border bg-card p-2 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        compact && 'p-1.5 text-xs',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar para reagendar"
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Thumbnail or channel icon */}
      <div className="shrink-0">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt=""
            width={compact ? 28 : 36}
            height={compact ? 28 : 36}
            className="rounded object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
            {CHANNEL_ICONS[post.channel] ?? null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium text-foreground', compact && 'text-xs')} title={post.caption}>
          {truncatedCaption}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <ChannelBadge channel={post.channel} />
          <QueueStatusBadge status={post.status} />
          {post.scheduledAt && (
            <span className="text-xs text-muted-foreground">{fmt.time(post.scheduledAt)}</span>
          )}
        </div>
      </div>

      {/* Kebab — Intake Review TASK-4 ST005 */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            disabled={busy || !canAct}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100 disabled:opacity-40"
            aria-label="Mais opcoes"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 text-sm shadow-md"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 outline-none focus:bg-muted"
              onSelect={togglePause}
              disabled={busy}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span>{isPaused ? 'Retomar' : 'Pausar'}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 outline-none focus:bg-muted"
              onSelect={download}
              disabled={busy}
            >
              <Download className="h-4 w-4" />
              <span>Baixar PNG</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-destructive outline-none focus:bg-destructive/10"
              onSelect={(e) => {
                e.preventDefault()
                setConfirmOpen(true)
              }}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" />
              <span>Remover</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        title="Remover da fila?"
        message="Esta acao remove o item da fila de publicacao. Nao e possivel remover itens ja publicados."
        confirmText="Remover"
      />
    </div>
  )
}
