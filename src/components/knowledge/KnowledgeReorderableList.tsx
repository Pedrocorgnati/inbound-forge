'use client'

// KnowledgeReorderableList — drag-and-drop nativo + autosave (TASK-13 ST001 / CL-039)
// Usa HTML5 drag API para evitar nova dependencia de dnd-kit.

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

export interface ReorderableItem {
  id: string
  label: string
  hint?: string
}

interface Props {
  type: 'cases' | 'pains' | 'patterns' | 'objections'
  initialItems: ReorderableItem[]
}

export function KnowledgeReorderableList({ type, initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ordered = useMemo(() => items.map((it, idx) => ({ ...it, order: idx + 1 })), [items])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  function persist() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiClient(`/api/v1/knowledge/${type}/reorder`, {
          method: 'POST',
          body: JSON.stringify({
            items: ordered.map((it) => ({ id: it.id, order: it.order })),
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Ordem atualizada', { duration: 1500 })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao salvar ordem')
      }
    }, 500)
  }

  function reorder(srcId: string, destIdx: number) {
    setItems((prev) => {
      const srcIdx = prev.findIndex((it) => it.id === srcId)
      if (srcIdx === -1 || srcIdx === destIdx) return prev
      const next = [...prev]
      const [moved] = next.splice(srcIdx, 1)
      next.splice(destIdx, 0, moved)
      return next
    })
    persist()
  }

  return (
    <ul
      role="list"
      data-testid={`reorderable-${type}`}
      className="space-y-1"
    >
      {ordered.map((it, idx) => (
        <li
          key={it.id}
          draggable
          onDragStart={(e) => {
            setDraggingId(it.id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', it.id)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('text/plain')
            reorder(id, idx)
            setDraggingId(null)
          }}
          onDragEnd={() => setDraggingId(null)}
          className={[
            'flex items-center gap-3 rounded border border-border bg-background px-3 py-2 text-sm cursor-grab',
            draggingId === it.id ? 'opacity-50' : '',
          ].join(' ')}
        >
          <span aria-hidden="true" className="text-muted-foreground">
            ⋮⋮
          </span>
          <span className="font-medium">{it.label}</span>
          {it.hint && <span className="text-xs text-muted-foreground">{it.hint}</span>}
          <span className="ml-auto text-xs text-muted-foreground">#{it.order}</span>
        </li>
      ))}
    </ul>
  )
}
