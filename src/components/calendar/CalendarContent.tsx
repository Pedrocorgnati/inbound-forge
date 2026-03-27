'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns'
import { useCalendarPosts } from '@/hooks/useCalendarPosts'
import { useDragReschedule } from '@/hooks/useDragReschedule'
import { CalendarGrid } from './CalendarGrid'
import { CalendarFilters } from './CalendarFilters'
import { PostRescheduleModal } from './PostRescheduleModal'
import type { PublishingPost } from '@/types/publishing'

type CalendarViewType = 'week' | 'month'

const ALL_CHANNELS = ['INSTAGRAM', 'LINKEDIN']
const ALL_STATUSES = ['DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED']

export function CalendarContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse URL params
  const urlView = searchParams.get('view') as CalendarViewType | null
  const urlDate = searchParams.get('date')

  const [view, setView] = useState<CalendarViewType>(
    urlView === 'week' || urlView === 'month' ? urlView : 'month',
  )
  const [currentDate, setCurrentDate] = useState(() =>
    urlDate ? new Date(urlDate) : new Date(),
  )
  const [filters, setFilters] = useState({
    channels: ALL_CHANNELS,
    statuses: ALL_STATUSES,
  })
  const [reschedulePost, setReschedulePost] = useState<PublishingPost | null>(null)

  // Mobile detection — default to week view on small screens
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isMobile && view === 'month') {
      setView('week')
    }
  }, [isMobile, view])

  // Compute date range
  const { startDate, endDate } = useMemo(() => {
    if (view === 'week') {
      return {
        startDate: startOfWeek(currentDate, { weekStartsOn: 0 }),
        endDate: endOfWeek(currentDate, { weekStartsOn: 0 }),
      }
    }
    return {
      startDate: startOfMonth(currentDate),
      endDate: endOfMonth(currentDate),
    }
  }, [view, currentDate])

  // Fetch posts
  const {
    posts,
    isLoading,
    error,
    refetch,
  } = useCalendarPosts({ startDate, endDate, filters })

  // Local state for optimistic updates
  const [localPosts, setLocalPosts] = useState(posts)

  useEffect(() => {
    setLocalPosts(posts)
  }, [posts])

  // Drag reschedule
  const { handleDragEnd } = useDragReschedule({
    posts: localPosts,
    onOptimisticUpdate: setLocalPosts,
    refetch,
  })

  // URL sync
  const updateUrl = useCallback(
    (newView: CalendarViewType, newDate: Date) => {
      const params = new URLSearchParams()
      params.set('view', newView)
      params.set('date', newDate.toISOString().split('T')[0])
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname],
  )

  function handleViewChange(newView: CalendarViewType) {
    setView(newView)
    updateUrl(newView, currentDate)
  }

  function handlePeriodChange(direction: 'prev' | 'next' | 'today') {
    let newDate: Date

    if (direction === 'today') {
      newDate = new Date()
    } else if (view === 'week') {
      newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1)
    } else {
      newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1)
    }

    setCurrentDate(newDate)
    updateUrl(view, newDate)
  }

  function handleReschedule(postId: string, newDate: Date) {
    // Simulate via the drag handler event format
    const fakeEvent = {
      active: { id: postId },
      over: { id: newDate.toISOString().split('T')[0] },
    }
    handleDragEnd(fakeEvent)
    setReschedulePost(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendario Editorial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Planejamento e agendamento de publicacoes
        </p>
      </div>

      {/* Filters */}
      <CalendarFilters filters={filters} onChange={setFilters} />

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Calendar grid */}
      <CalendarGrid
        posts={localPosts}
        startDate={startDate}
        endDate={endDate}
        view={view}
        onViewChange={handleViewChange}
        onPeriodChange={handlePeriodChange}
        isLoading={isLoading}
      />

      {/* Reschedule modal */}
      <PostRescheduleModal
        post={reschedulePost}
        open={reschedulePost !== null}
        onClose={() => setReschedulePost(null)}
        onReschedule={handleReschedule}
      />
    </div>
  )
}
