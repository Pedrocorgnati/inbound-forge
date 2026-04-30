'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { MoreHorizontal, GripVertical, Instagram, Linkedin, Pause, Play, Download, Trash2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFormatters } from '@/lib/i18n/formatters'
import { ChannelBadge } from '@/components/publishing/ChannelBadge'
import { QueueStatusBadge } from '@/components/publishing/QueueStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PostHoverPreview } from './PostHoverPreview'
import type { PublishingPost } from '@/types/publishing'

// TASK-14 ST005 (M11.15 / G-005) — preview expandido on hover/focus.
const HOVER_OPEN_DELAY_MS = 300
const HOVER_CLOSE_DELAY_MS = 120

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

  // TASK-14 ST005 (G-005) — controle do hover preview com debounce.
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'hover' | 'touch'>('hover')
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // RS-4: long-press para abrir preview em mobile/touch.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LONG_PRESS_MS = 500

  // Cleanup timers ao desmontar para evitar setState em componente unmounted.
  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const openPreview = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (previewOpen) return
    setPreviewMode('hover')
    openTimerRef.current = setTimeout(() => setPreviewOpen(true), HOVER_OPEN_DELAY_MS)
  }, [previewOpen])

  const closePreview = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    closeTimerRef.current = setTimeout(() => setPreviewOpen(false), HOVER_CLOSE_DELAY_MS)
  }, [])

  // RS-4 long-press handlers para abrir preview em touch.
  const handleTouchStart = useCallback(() => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      setPreviewMode('touch')
      setPreviewOpen(true)
    }, LONG_PRESS_MS)
  }, [])

  const handleTouchEndOrCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const closePreviewImmediate = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setPreviewOpen(false)
  }, [])

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
      onMouseEnter={openPreview}
      onMouseLeave={closePreview}
      onFocusCapture={openPreview}
      onBlurCapture={(e) => {
        // Fechar apenas quando o foco saiu do card por completo (incluindo descendants).
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          closePreview()
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEndOrCancel}
      onTouchCancel={handleTouchEndOrCancel}
      onTouchMove={handleTouchEndOrCancel}
      className={cn(
        'group relative flex min-h-[44px] items-start gap-2 rounded-md border border-border bg-card p-2 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50',
        compact && 'p-1.5 text-xs',
      )}
    >
      {/* TASK-14 ST005 (G-005) — preview expandido on hover/focus (desktop) */}
      {previewOpen && !isDragging && previewMode === 'hover' && (
        <div
          className="absolute left-full top-0 z-50 ml-2 hidden sm:block"
          onMouseEnter={() => {
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current)
              closeTimerRef.current = null
            }
          }}
          onMouseLeave={closePreview}
        >
          <PostHoverPreview post={post} />
        </div>
      )}
      {/* RS-4 — preview em sheet centralizada para mobile/touch (long-press) */}
      {previewOpen && !isDragging && previewMode === 'touch' && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={closePreviewImmediate}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="m-4 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <PostHoverPreview post={post} />
            <button
              type="button"
              onClick={closePreviewImmediate}
              className="mt-2 w-full rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
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
