'use client'

// TASK-2 ST002 (CL-138) — Card de post arrastavel.
// Suporta mouse (HTML5 drag), touch (long-press 250ms) e teclado.
// Encapsula PostMiniCard sem duplicar visual.

import * as React from 'react'
import { PostMiniCard } from './PostMiniCard'
import { useCalendarDrag } from './CalendarDragContext'
import type { PublishingPost } from '@/types/publishing'

const LONG_PRESS_MS = 250

interface DraggablePostCardProps {
  post: PublishingPost
  compact?: boolean
}

export function DraggablePostCard({ post, compact = false }: DraggablePostCardProps) {
  const ctx = useCalendarDrag()
  const [isDragging, setIsDragging] = React.useState(false)
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchActiveRef = React.useRef(false)

  // --- Mouse / HTML5 drag ---
  const handleDragStart = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!ctx) return
      setIsDragging(true)
      ctx.setActiveId(post.id)
      try {
        e.dataTransfer.setData('text/postId', post.id)
        e.dataTransfer.effectAllowed = 'move'
      } catch {
        /* ignore IE quirks */
      }
    },
    [ctx, post.id],
  )

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false)
    if (ctx) {
      // Se nao houve drop em slot valido, ctx.overId == null. Libera estado.
      ctx.triggerDragEnd(post.id, ctx.overId)
    }
  }, [ctx, post.id])

  // --- Touch (long-press) ---
  const handleTouchStart = React.useCallback(() => {
    if (!ctx) return
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      touchActiveRef.current = true
      setIsDragging(true)
      ctx.setActiveId(post.id)
    }, LONG_PRESS_MS)
  }, [ctx, post.id])

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!ctx || !touchActiveRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const slot = el?.closest('[data-droppable-id]') as HTMLElement | null
      const slotId = slot?.dataset.droppableId ?? null
      ctx.setOverId(slotId)
    },
    [ctx],
  )

  const handleTouchEnd = React.useCallback(() => {
    if (!ctx) return
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (touchActiveRef.current) {
      touchActiveRef.current = false
      setIsDragging(false)
      ctx.triggerDragEnd(post.id, ctx.overId)
    }
  }, [ctx, post.id])

  // --- Keyboard (a11y) ---
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!ctx) return
      if ((e.key === ' ' || e.key === 'Enter') && !isDragging) {
        e.preventDefault()
        setIsDragging(true)
        ctx.setActiveId(post.id)
        return
      }
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false)
        ctx.setActiveId(null)
        ctx.setOverId(null)
      }
    },
    [ctx, isDragging, post.id],
  )

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      aria-grabbed={isDragging}
      aria-label={`Arrastar post ${post.caption.slice(0, 40)}`}
      data-draggable-post-id={post.id}
      data-dragging={isDragging ? 'true' : 'false'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      style={{ touchAction: 'manipulation' }}
    >
      <PostMiniCard post={post} compact={compact} isDragging={isDragging} />
    </div>
  )
}
