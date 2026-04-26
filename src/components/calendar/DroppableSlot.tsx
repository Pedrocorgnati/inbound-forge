'use client'

// TASK-2 ST002 (CL-138) — Slot receptor de drop no calendario.
// Aceita um postId arrastado e dispara o drop end via contexto.
// Visual hover/over e gerenciado via data-attribute para style hooks.

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useCalendarDrag } from './CalendarDragContext'

interface DroppableSlotProps {
  /** ISO date ou similar — identifica o slot no DragEndEvent. */
  slotId: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function DroppableSlot({
  slotId,
  children,
  className,
  disabled = false,
}: DroppableSlotProps) {
  const ctx = useCalendarDrag()
  const [isOver, setIsOver] = React.useState(false)

  const handleDragOver = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!ctx || disabled) return
      e.preventDefault() // necessario para permitir drop
      try {
        e.dataTransfer.dropEffect = 'move'
      } catch {
        /* noop */
      }
      if (!isOver) setIsOver(true)
      ctx.setOverId(slotId)
    },
    [ctx, disabled, isOver, slotId],
  )

  const handleDragLeave = React.useCallback(() => {
    setIsOver(false)
    if (ctx?.overId === slotId) ctx.setOverId(null)
  }, [ctx, slotId])

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!ctx || disabled) return
      e.preventDefault()
      setIsOver(false)
      const postId = e.dataTransfer.getData('text/postId') || ctx.activeId
      if (postId) {
        ctx.triggerDragEnd(postId, slotId)
      }
    },
    [ctx, disabled, slotId],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!ctx || disabled) return
      // Enter/Space em slot com activeId = drop de teclado
      if ((e.key === 'Enter' || e.key === ' ') && ctx.activeId) {
        e.preventDefault()
        ctx.triggerDragEnd(ctx.activeId, slotId)
      }
    },
    [ctx, disabled, slotId],
  )

  return (
    <div
      data-droppable-id={slotId}
      data-over={isOver ? 'true' : 'false'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      aria-dropeffect={disabled ? 'none' : 'move'}
      className={cn(
        className,
        isOver && 'ring-2 ring-primary ring-offset-1 bg-primary/10',
      )}
    >
      {children}
    </div>
  )
}
