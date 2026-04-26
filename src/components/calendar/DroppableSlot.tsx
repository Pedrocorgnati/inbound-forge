'use client'

// TASK-2 ST002 (CL-138) — Slot receptor de drop no calendario.
// Aceita um postId arrastado e dispara o drop end via contexto.
// Visual hover/over e gerenciado via data-attribute para style hooks.
//
// TASK-11 ST001 (M11.4 / G-001) — clique em slot vazio dispara onSlotClick
// para abrir o drawer de criacao de post (PostFormDrawer).

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useCalendarDrag } from './CalendarDragContext'

interface DroppableSlotProps {
  /** ISO date ou similar — identifica o slot no DragEndEvent. */
  slotId: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  /**
   * Marca o slot como vazio (sem posts). Quando `true` em conjunto com
   * `onSlotClick`, o slot reage a clique/Enter/Space chamando `onSlotClick(slotId)`.
   */
  isEmpty?: boolean
  /** Handler chamado quando o operador clica num slot vazio. */
  onSlotClick?: (slotId: string) => void
}

export function DroppableSlot({
  slotId,
  children,
  className,
  disabled = false,
  isEmpty = false,
  onSlotClick,
}: DroppableSlotProps) {
  const ctx = useCalendarDrag()
  const [isOver, setIsOver] = React.useState(false)

  const clickable = !disabled && isEmpty && !!onSlotClick

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

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!clickable) return
      // Se ha drag em andamento, nao tratar como click de criacao.
      if (ctx?.activeId) return
      // Ignora cliques em filhos interativos (links, buttons, inputs).
      const target = e.target as HTMLElement | null
      if (target && target.closest('button, a, input, select, textarea, [role="button"]')) {
        return
      }
      onSlotClick?.(slotId)
    },
    [clickable, ctx?.activeId, onSlotClick, slotId],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!ctx || disabled) {
        // ainda permite Enter/Space para criacao em slot vazio mesmo sem ctx
      }
      // Enter/Space em slot com activeId = drop de teclado
      if ((e.key === 'Enter' || e.key === ' ') && ctx?.activeId) {
        e.preventDefault()
        ctx.triggerDragEnd(ctx.activeId, slotId)
        return
      }
      // Enter/Space em slot vazio = abre drawer de criacao
      if ((e.key === 'Enter' || e.key === ' ') && clickable) {
        e.preventDefault()
        onSlotClick?.(slotId)
      }
    },
    [clickable, ctx, disabled, onSlotClick, slotId],
  )

  return (
    <div
      data-droppable-id={slotId}
      data-over={isOver ? 'true' : 'false'}
      data-empty={isEmpty ? 'true' : 'false'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? `Criar post em ${slotId}` : undefined}
      aria-dropeffect={disabled ? 'none' : 'move'}
      className={cn(
        className,
        clickable && 'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        isOver && 'ring-2 ring-primary ring-offset-1 bg-primary/10',
      )}
    >
      {children}
    </div>
  )
}
