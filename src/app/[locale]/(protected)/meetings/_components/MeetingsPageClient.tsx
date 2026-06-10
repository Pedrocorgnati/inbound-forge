'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck2, ExternalLink, RefreshCw, SearchX, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'

type MeetingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

interface MeetingRow {
  id: string
  leadId: string
  leadName: string
  company: string | null
  theme: { id: string; title: string; conversionScore: number } | null
  occurredAt: string
  status: MeetingStatus
  bookingStatus: string | null
  externalBookingId: string | null
  calComUrl: string | null
  notes: string | null
  type: 'MEETING' | 'CALENDAR_BOOKING'
}

interface ApiResponse {
  data?: MeetingRow[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

interface MeetingsPageClientProps {
  locale: string
}

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

const STATUS_LABELS: Record<MeetingStatus, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Realizada',
  no_show: 'No-show',
}

const STATUS_VARIANT: Record<MeetingStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  confirmed: 'success',
  cancelled: 'danger',
  completed: 'info',
  no_show: 'warning',
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function MeetingsPageClient({ locale }: MeetingsPageClientProps) {
  const [items, setItems] = useState<MeetingRow[]>([])
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status })

    try {
      const res = await fetch(`/api/v1/meetings?${params.toString()}`)
      const json = (await res.json().catch(() => ({}))) as ApiResponse
      if (!res.ok) throw new Error(json.error ?? 'Falha ao carregar reuniões')
      setItems(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar reuniões'
      setError(message)
      setItems([])
      setTotal(0)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [page, status])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const counters = useMemo(() => ({
    confirmed: items.filter((item) => item.status === 'confirmed').length,
    cancelled: items.filter((item) => item.status === 'cancelled').length,
    completed: items.filter((item) => item.status === 'completed').length,
  }), [items])

  return (
    <div className="space-y-6" data-testid="meetings-page-client">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Confirmadas</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counters.confirmed}</p></CardContent>
        </Card>
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Realizadas</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counters.completed}</p></CardContent>
        </Card>
        <Card variant="surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Canceladas</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">{counters.cancelled}</p></CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          options={STATUS_OPTIONS}
        />
        <Button type="button" variant="outline" onClick={fetchItems} disabled={isLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Recarregar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando reuniões">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-10 w-10" aria-hidden />}
          title="Nenhuma reunião encontrada"
          description="Quando o webhook Cal.com registrar reuniões, elas aparecerão aqui com lead e tema de origem."
          className="rounded-lg border border-border"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[1.4fr_1.2fr_1fr_0.9fr_0.9fr] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase text-muted-foreground lg:grid">
            <span>Lead</span>
            <span>Tema origem</span>
            <span>Data</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          <ul className="divide-y divide-border">
            {items.map((meeting) => {
              const leadHref = `/${locale}/leads/${meeting.leadId}`
              const themeHref = meeting.theme ? `/${locale}/themes/${meeting.theme.id}` : null

              return (
                <li
                  key={meeting.id}
                  className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.4fr_1.2fr_1fr_0.9fr_0.9fr] lg:items-center"
                >
                  <div className="min-w-0">
                    <Link href={leadHref} className="font-medium text-foreground hover:text-primary">
                      {meeting.leadName}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {meeting.company ?? 'Empresa não informada'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    {themeHref ? (
                      <Link href={themeHref} className="text-foreground hover:text-primary">
                        {meeting.theme?.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Tema não atribuído</span>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <CalendarCheck2 className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{formatDateTime(meeting.occurredAt, locale)}</span>
                  </div>

                  <div>
                    <Badge variant={STATUS_VARIANT[meeting.status]}>{STATUS_LABELS[meeting.status]}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={leadHref}>Abrir lead</Link>
                    </Button>
                    {meeting.calComUrl ? (
                      <Button asChild variant="ghost" size="sm">
                        <a href={meeting.calComUrl} target="_blank" rel="noreferrer">
                          <Video className="h-4 w-4" aria-hidden />
                          Cal.com
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </Button>
                    ) : (
                      <span className="inline-flex h-9 items-center rounded-md px-2 text-xs text-muted-foreground">
                        Sem link Cal.com
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Pagination total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
    </div>
  )
}
