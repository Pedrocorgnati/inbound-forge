'use client'

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
} from 'date-fns'
import { DraggablePostCard } from './DraggablePostCard'
import { DroppableSlot } from './DroppableSlot'
import { cn } from '@/lib/utils'
import type { PublishingPost } from '@/types/publishing'

interface MonthViewProps {
  posts: Record<string, PublishingPost[]>
  startDate: Date
}

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MAX_VISIBLE_POSTS = 3

export function MonthView({ posts, startDate }: MonthViewProps) {
  const monthStart = startOfMonth(startDate)
  const monthEnd = endOfMonth(startDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const today = format(new Date(), 'yyyy-MM-dd')

  // Build array of all calendar days
  const days: Date[] = []
  let current = calendarStart
  while (current <= calendarEnd) {
    days.push(current)
    current = addDays(current, 1)
  }

  // Chunk into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((name) => (
          <div
            key={name}
            className="py-1 text-center text-xs font-semibold uppercase text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const dayPosts = posts[key] ?? []
              const visiblePosts = dayPosts.slice(0, MAX_VISIBLE_POSTS)
              const remaining = dayPosts.length - MAX_VISIBLE_POSTS
              const isCurrentMonth = isSameMonth(date, startDate)
              const dayNumber = date.getDate()
              const isToday = key === today

              return (
                <DroppableSlot
                  key={key}
                  slotId={key}
                  className={cn(
                    'min-h-[80px] rounded-md border border-border p-1 transition-colors',
                    !isCurrentMonth && 'opacity-50',
                    isToday && 'bg-primary/5 border-primary/40',
                  )}
                >
                  <div className="mb-0.5 flex items-center justify-end">
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium',
                        isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                      )}
                    >
                      {dayNumber}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {visiblePosts.map((post) => (
                      <DraggablePostCard key={post.id} post={post} compact />
                    ))}
                    {remaining > 0 && (
                      <button
                        type="button"
                        className="w-full rounded bg-muted px-1 py-0.5 text-center text-[10px] font-medium text-muted-foreground hover:bg-muted/80"
                      >
                        +{remaining} mais
                      </button>
                    )}
                  </div>
                </DroppableSlot>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
