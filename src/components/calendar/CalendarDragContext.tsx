'use client'

// TASK-2 ST001 (CL-138) — Contexto minimalista de drag-and-drop do calendario.
// Substitui @dnd-kit (nao instalado no workspace) por primitivas nativas:
// - Mouse: HTML5 drag-and-drop (dragstart/dragover/drop)
// - Touch: long-press (250ms) + document.elementFromPoint para detectar alvo
// - Keyboard: Enter/Space para "pegar" e mover via setas
//
// A API publica segue o formato { active.id, over.id } de @dnd-kit para
// manter compatibilidade com `useDragReschedule.handleDragEnd`.

import * as React from 'react'

export interface DragEndEvent {
  active: { id: string | number }
  over: { id: string | number } | null
}

interface CalendarDragContextValue {
  activeId: string | null
  overId: string | null
  setActiveId: (id: string | null) => void
  setOverId: (id: string | null) => void
  triggerDragEnd: (activeId: string, overId: string | null) => void
}

const CalendarDragContext = React.createContext<CalendarDragContextValue | null>(null)

interface CalendarDragProviderProps {
  children: React.ReactNode
  onDragEnd: (event: DragEndEvent) => void
}

export function CalendarDragProvider({ children, onDragEnd }: CalendarDragProviderProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)

  const triggerDragEnd = React.useCallback(
    (aid: string, oid: string | null) => {
      onDragEnd({
        active: { id: aid },
        over: oid ? { id: oid } : null,
      })
      setActiveId(null)
      setOverId(null)
    },
    [onDragEnd],
  )

  const value = React.useMemo<CalendarDragContextValue>(
    () => ({ activeId, overId, setActiveId, setOverId, triggerDragEnd }),
    [activeId, overId, triggerDragEnd],
  )

  return (
    <div data-dnd-context="calendar">
      <CalendarDragContext.Provider value={value}>{children}</CalendarDragContext.Provider>
    </div>
  )
}

export function useCalendarDrag() {
  const ctx = React.useContext(CalendarDragContext)
  if (!ctx) {
    // Fora do provider o calendario funciona em modo leitura (sem drag)
    return null
  }
  return ctx
}
