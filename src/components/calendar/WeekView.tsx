'use client'

import { addDays, format } from 'date-fns'
import { CalendarDay } from './CalendarDay'
import type { PublishingPost } from '@/types/publishing'

interface WeekViewProps {
  posts: Record<string, PublishingPost[]>
  startDate: Date
  /** TASK-11 ST005 — propaga clique em slot vazio. */
  onSlotClick?: (slotId: string) => void
}

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export function WeekView({ posts, startDate, onSlotClick }: WeekViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentMonth = new Date().getMonth()

  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

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

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const key = format(date, 'yyyy-MM-dd')
          return (
            <CalendarDay
              key={key}
              date={date}
              posts={posts[key] ?? []}
              isToday={key === today}
              isCurrentMonth={date.getMonth() === currentMonth}
              onSlotClick={onSlotClick}
            />
          )
        })}
      </div>
    </div>
  )
}
