'use client'

import type * as React from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { DraggablePostCard } from './DraggablePostCard'
import { DroppableSlot } from './DroppableSlot'
import type { PublishingPost } from '@/types/publishing'

interface CalendarDayProps {
  date: Date
  posts: PublishingPost[]
  isToday: boolean
  isCurrentMonth: boolean
  isDropTarget?: boolean
  droppableRef?: (el: HTMLElement | null) => void
  droppableProps?: Record<string, unknown>
  /** TASK-11 ST005 — clique em dia vazio abre PostFormDrawer (M11.4 / G-001). */
  onSlotClick?: (slotId: string) => void
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function CalendarDay({
  date,
  posts,
  isToday,
  isCurrentMonth,
  isDropTarget = false,
  droppableRef,
  droppableProps,
  onSlotClick,
}: CalendarDayProps) {
  const dayNumber = date.getDate()
  const monthName = MONTH_NAMES[date.getMonth()]
  const postCountLabel = posts.length > 0 ? `, ${posts.length} post${posts.length > 1 ? 's' : ''}` : ''
  const slotId = format(date, 'yyyy-MM-dd')
  const isEmpty = posts.length === 0

  return (
    <DroppableSlot
      slotId={slotId}
      isEmpty={isEmpty}
      onSlotClick={onSlotClick}
      className={cn(
        'min-h-[100px] rounded-md border border-border p-1.5 transition-colors',
        !isCurrentMonth && 'opacity-50',
        isToday && 'bg-primary/5 border-primary/40',
        isDropTarget && 'border-2 border-primary bg-primary/10',
      )}
    >
      <div
        ref={droppableRef as React.LegacyRef<HTMLDivElement> | undefined}
        {...droppableProps}
        aria-label={`dia ${dayNumber} de ${monthName}${postCountLabel}`}
      >
        <div className="mb-1 flex items-center justify-end">
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
              isToday
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground',
            )}
          >
            {dayNumber}
          </span>
        </div>

        <div className="space-y-1">
          {posts.map((post) => (
            <DraggablePostCard key={post.id} post={post} compact />
          ))}
        </div>
      </div>
    </DroppableSlot>
  )
}
