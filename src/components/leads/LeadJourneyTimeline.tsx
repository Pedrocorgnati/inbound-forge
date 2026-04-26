'use client'

/**
 * TASK-8/ST002 (CL-202) — Timeline de jornada do lead.
 */
import { useMemo } from 'react'
import useSWR from 'swr'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Eye,
  FileText,
  CheckCircle,
  MousePointer,
  Mail,
  type LucideIcon,
} from 'lucide-react'
import {
  EVENT_TYPES,
  mapEventToColor,
  mapEventToLabel,
  type LeadEventType,
  type LeadJourneyEvent,
} from '@/lib/types/lead-journey.types'
import { Skeleton } from '@/components/ui/skeleton'

const ICONS: Record<LeadEventType, LucideIcon> = {
  'post-view': Eye,
  'form-submit': FileText,
  conversion: CheckCircle,
  'utm-click': MousePointer,
  'email-open': Mail,
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

interface Props {
  leadId: string
}

export function LeadJourneyTimeline({ leadId }: Props) {
  const t = useTranslations('leadJourney')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedTypes = useMemo<Set<LeadEventType>>(() => {
    const raw = searchParams.get('types')
    if (!raw) return new Set(EVENT_TYPES)
    return new Set(raw.split(',').filter((x) => EVENT_TYPES.includes(x as LeadEventType)) as LeadEventType[])
  }, [searchParams])

  const { data, error, isLoading } = useSWR<{ data: LeadJourneyEvent[] }>(
    `/api/v1/leads/${leadId}/journey`,
    fetcher
  )

  function toggleType(type: LeadEventType) {
    const next = new Set(selectedTypes)
    if (next.has(type)) { next.delete(type) } else { next.add(type) }
    const params = new URLSearchParams(searchParams.toString())
    if (next.size === EVENT_TYPES.length) params.delete('types')
    else params.set('types', Array.from(next).join(','))
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="lead-journey-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('error')}
      </p>
    )
  }

  const events = (data?.data ?? []).filter((ev) => selectedTypes.has(ev.type))

  return (
    <div data-testid="lead-journey-timeline">
      <div className="mb-4 flex flex-wrap gap-2">
        {EVENT_TYPES.map((type) => {
          const active = selectedTypes.has(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs ${
                active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              {t(`filter.${type}`)}
            </button>
          )
        })}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="relative border-l border-border pl-6">
          {events.map((event) => {
            const Icon = ICONS[event.type]
            return (
              <li key={event.id} className="mb-6">
                <span
                  className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ${mapEventToColor(event.type)}`}
                  aria-hidden
                />
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
                  <div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()}
                    </time>
                    <p className="text-sm font-medium">{mapEventToLabel(event, (k) => t(k))}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
