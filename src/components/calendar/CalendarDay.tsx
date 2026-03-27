'use client'

import { cn } from '@/lib/utils'
import { PostMiniCard } from './PostMiniCard'
import type { PublishingPost } from '@/types/publishing'

interface CalendarDayProps {
  date: Date
  posts: PublishingPost[]
  isToday: boolean
  isCurrentMonth: boolean
  isDropTarget?: boolean
  droppableRef?: (el: HTMLElement | null) => void
  droppableProps?: Record<string, unknown>
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
}: CalendarDayProps) {
  const dayNumber = date.getDate()
  const monthName = MONTH_NAMES[date.getMonth()]
  const postCountLabel = posts.length > 0 ? `, ${posts.length} post${posts.length > 1 ? 's' : ''}` : ''

  return (
    <div
      ref={droppableRef}
      {...droppableProps}
      aria-label={`dia ${dayNumber} de ${monthName}${postCountLabel}`}
      className={cn(
        'min-h-[100px] rounded-md border border-gray-200 p-1.5 transition-colors',
        !isCurrentMonth && 'opacity-50',
        isToday && 'bg-indigo-50/50 border-indigo-300',
        isDropTarget && 'border-2 border-indigo-600 bg-indigo-50',
      )}
    >
      <div className="mb-1 flex items-center justify-end">
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
            isToday
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700',
          )}
        >
          {dayNumber}
        </span>
      </div>

      <div className="space-y-1">
        {posts.map((post) => (
          <PostMiniCard key={post.id} post={post} compact />
        ))}
      </div>
    </div>
  )
}
