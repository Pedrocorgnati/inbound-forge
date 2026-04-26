'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  parseISO,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LayoutList, LayoutGrid } from 'lucide-react'
import { useCalendarPosts } from '@/hooks/useCalendarPosts'
import { useDragReschedule } from '@/hooks/useDragReschedule'
import { CalendarGrid } from './CalendarGrid'
import { CalendarListView } from './CalendarListView'
import { CalendarFilters } from './CalendarFilters'
import { PostRescheduleModal } from './PostRescheduleModal'
import { PostFormDrawer } from './PostFormDrawer'
import { CalendarDragProvider } from './CalendarDragContext'
import type { PublishingPost } from '@/types/publishing'
import { STORAGE_KEYS } from '@/constants/storage-keys'

type CalendarViewType = 'week' | 'month'

const ALL_CHANNELS = ['INSTAGRAM', 'LINKEDIN', 'BLOG']
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
  // TASK-11 ST004 (M11.4 / G-001) — slot selecionado abre PostFormDrawer
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)

  // Mobile detection — default to week view on small screens
  const [isMobile, setIsMobile] = useState(false)

  // ST003: list-view toggle (default on, persisted to localStorage)
  const [showListView, setShowListView] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(STORAGE_KEYS.CALENDAR_LIST_VIEW)
    return saved !== null ? saved === 'true' : true
  })

  const toggleListView = useCallback(() => {
    setShowListView(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEYS.CALENDAR_LIST_VIEW, String(next))
      return next
    })
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function check() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768)
      }, 150)
    }
    // Run immediately on mount (without debounce)
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('resize', check)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    // Only force week view when in grid mode on mobile
    if (isMobile && !showListView && view === 'month') {
      setView('week')
    }
  }, [isMobile, showListView, view])

  // Compute date range
  const { startDate, endDate } = useMemo(() => {
    if (isMobile && showListView) {
      return {
        startDate: startOfMonth(currentDate),
        endDate: endOfMonth(currentDate),
      }
    }
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
  }, [view, currentDate, isMobile, showListView])

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

  const handleViewChange = useCallback((newView: CalendarViewType) => {
    setView(newView)
    updateUrl(newView, currentDate)
  }, [currentDate, updateUrl])

  const handlePeriodChange = useCallback((direction: 'prev' | 'next' | 'today') => {
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
  }, [view, currentDate, updateUrl])

  // ST001: list-view navigates by month regardless of grid view state
  const handleListPeriodChange = useCallback((direction: 'prev' | 'next' | 'today') => {
    const newDate =
      direction === 'today'
        ? new Date()
        : direction === 'prev'
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1)
    setCurrentDate(newDate)
    updateUrl(view, newDate)
  }, [currentDate, view, updateUrl])

  const handleReschedule = useCallback((postId: string, newDate: Date) => {
    // Simulate via the drag handler event format
    const fakeEvent = {
      active: { id: postId },
      over: { id: newDate.toISOString().split('T')[0] },
    }
    handleDragEnd(fakeEvent)
    setReschedulePost(null)
  }, [handleDragEnd])

  // TASK-11 ST004 (M11.4 / G-001) — abre drawer com a data clicada.
  const handleSlotClick = useCallback((slotId: string) => {
    // slotId esta no formato 'yyyy-MM-dd'. Mantem horario padrao 09:00 local.
    const base = parseISO(slotId)
    if (Number.isNaN(base.getTime())) return
    base.setHours(9, 0, 0, 0)
    setSelectedSlot(base)
  }, [])

  const handlePostCreated = useCallback(() => {
    if (selectedSlot) {
      const dateLabel = format(selectedSlot, "dd 'de' MMMM", { locale: ptBR })
      toast.success(`Post criado para ${dateLabel}`)
    }
    refetch()
  }, [selectedSlot, refetch])

  return (
    <CalendarDragProvider onDragEnd={handleDragEnd}>
    <div data-testid="calendar-content" className="space-y-6">
      {/* Page header */}
      <div data-testid="calendar-header" className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario Editorial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planejamento e agendamento de publicacoes
          </p>
        </div>

        {/* ST003: toggle list/grid — mobile only */}
        <button
          data-testid="calendar-view-toggle-button"
          type="button"
          onClick={toggleListView}
          className="lg:hidden mt-1 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={showListView ? 'Mudar para visualização em grade' : 'Mudar para lista cronológica'}
          aria-pressed={showListView}
        >
          {showListView ? (
            <><LayoutGrid className="h-4 w-4" /><span>Grade</span></>
          ) : (
            <><LayoutList className="h-4 w-4" /><span>Lista</span></>
          )}
        </button>
      </div>

      {/* Filters */}
      <div data-testid="calendar-filters">
        <CalendarFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Error */}
      {error && (
        <div data-testid="calendar-error" className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* ST001: list view on mobile, grid on desktop */}
      {isMobile && showListView ? (
        <CalendarListView
          data-testid="calendar-list-view"
          posts={localPosts}
          currentDate={currentDate}
          onPeriodChange={handleListPeriodChange}
          onReschedule={setReschedulePost}
          onSlotClick={handleSlotClick}
          isLoading={isLoading}
        />
      ) : (
        <CalendarGrid
          data-testid="calendar-grid"
          posts={localPosts}
          startDate={startDate}
          endDate={endDate}
          view={view}
          onViewChange={handleViewChange}
          onPeriodChange={handlePeriodChange}
          onSlotClick={handleSlotClick}
          isLoading={isLoading}
        />
      )}

      {/* Reschedule modal */}
      <PostRescheduleModal
        post={reschedulePost}
        open={reschedulePost !== null}
        onClose={() => setReschedulePost(null)}
        onReschedule={handleReschedule}
      />

      {/* TASK-11 ST004 — Drawer de criacao acionado por clique em data vazia */}
      <PostFormDrawer
        open={selectedSlot !== null}
        defaultDate={selectedSlot ?? undefined}
        onClose={() => setSelectedSlot(null)}
        onCreated={handlePostCreated}
      />
    </div>
    </CalendarDragProvider>
  )
}
