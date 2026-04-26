'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PublishingPost } from '@/types/publishing'

interface DragEndEvent {
  active: { id: string | number }
  over: { id: string | number } | null
}

interface UseDragRescheduleParams {
  posts: Record<string, PublishingPost[]>
  onOptimisticUpdate: (posts: Record<string, PublishingPost[]>) => void
  refetch: () => void
}

interface UseDragRescheduleReturn {
  handleDragEnd: (event: DragEndEvent) => void
  isDragging: boolean
}

interface SlotCheckResponse {
  ok: boolean
  reason?: string
  message?: string
}

// Intake-Review TASK-1 ST005 (CL-080):
// - preflight em /api/v1/posts/check-slot antes do PATCH
// - new Date(y, m-1, d, h, m) preserva o timezone local do operador
//   (toISOString() serializa o instante UTC correspondente)
export function useDragReschedule({
  posts,
  onOptimisticUpdate,
  refetch,
}: UseDragRescheduleParams): UseDragRescheduleReturn {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragging(false)
      const { active, over } = event
      if (!over) return

      const postId = String(active.id)
      const newDateStr = String(over.id)

      let movedPost: PublishingPost | null = null
      let oldDateKey: string | null = null

      for (const [dateKey, datePosts] of Object.entries(posts)) {
        const found = datePosts.find((p) => p.id === postId)
        if (found) {
          movedPost = found
          oldDateKey = dateKey
          break
        }
      }

      if (!movedPost || !oldDateKey || oldDateKey === newDateStr) return

      const originalDate = movedPost.scheduledAt
        ? new Date(movedPost.scheduledAt)
        : new Date()
      const [year, month, day] = newDateStr.split('-').map(Number)
      const newScheduledAt = new Date(
        year,
        month - 1,
        day,
        originalDate.getHours(),
        originalDate.getMinutes(),
      )

      const prevPosts = { ...posts }
      const updatedPosts = { ...posts }

      updatedPosts[oldDateKey] = (updatedPosts[oldDateKey] ?? []).filter(
        (p) => p.id !== postId,
      )
      if (updatedPosts[oldDateKey].length === 0) {
        delete updatedPosts[oldDateKey]
      }

      const updatedPost = { ...movedPost, scheduledAt: newScheduledAt }
      updatedPosts[newDateStr] = [...(updatedPosts[newDateStr] ?? []), updatedPost]

      onOptimisticUpdate(updatedPosts)

      try {
        const channel = (movedPost as { channel?: string }).channel
        if (channel) {
          const qs = new URLSearchParams({
            channel,
            scheduledAt: newScheduledAt.toISOString(),
            ignorePostId: postId,
          })
          const check = await fetch(`/api/v1/posts/check-slot?${qs}`)
          if (check.ok) {
            const slot = (await check.json()) as SlotCheckResponse
            if (!slot.ok) {
              onOptimisticUpdate(prevPosts)
              toast.error(slot.message ?? 'Slot indisponivel')
              return
            }
          }
        }

        const res = await fetch(`/api/v1/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledAt: newScheduledAt.toISOString() }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Falha ao reagendar' }))
          throw new Error(err.error ?? 'Falha ao reagendar')
        }

        const formattedDate = format(newScheduledAt, "dd 'de' MMMM", {
          locale: ptBR,
        })
        toast.success(`Post reagendado para ${formattedDate}`)
      } catch (e) {
        onOptimisticUpdate(prevPosts)
        toast.error(e instanceof Error ? e.message : 'Erro ao reagendar post')
        refetch()
      }
    },
    [posts, onOptimisticUpdate, refetch],
  )

  return { handleDragEnd, isDragging }
}
