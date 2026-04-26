'use client'

import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'
import type { PostStatus } from '@/types/publishing'

interface CalendarFiltersState {
  channels: string[]
  statuses: string[]
}

interface CalendarFiltersProps {
  filters: CalendarFiltersState
  onChange: (filters: CalendarFiltersState) => void
}

const CHANNEL_OPTIONS = Object.entries(PUBLISHING_CHANNELS).map(([key, cfg]) => ({
  value: key,
  label: cfg.label,
}))

const STATUS_OPTIONS: { value: PostStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'FAILED', label: 'Falhou' },
]

const ALL_CHANNELS = CHANNEL_OPTIONS.map((c) => c.value)
const ALL_STATUSES = STATUS_OPTIONS.map((s) => s.value)

export function CalendarFilters({ filters, onChange }: CalendarFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleChannelToggle(channel: string) {
    const next = filters.channels.includes(channel)
      ? filters.channels.filter((c) => c !== channel)
      : [...filters.channels, channel]
    onChange({ ...filters, channels: next })
  }

  function handleStatusToggle(status: string) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses: next })
  }

  function handleClear() {
    onChange({ channels: ALL_CHANNELS, statuses: ALL_STATUSES })
  }

  const isAllSelected =
    filters.channels.length === ALL_CHANNELS.length &&
    filters.statuses.length === ALL_STATUSES.length

  const filterContent = (
    <div className="space-y-4">
      {/* Channels */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Canais</p>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((ch) => (
            <label key={ch.value} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={filters.channels.includes(ch.value)}
                onChange={() => handleChannelToggle(ch.value)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">{ch.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Statuses */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((st) => (
            <label key={st.value} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={filters.statuses.includes(st.value)}
                onChange={() => handleStatusToggle(st.value)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">{st.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear */}
      {!isAllSelected && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">{filterContent}</div>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>

        {mobileOpen && (
          <div className="mt-2 rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filtros</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Fechar filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterContent}
          </div>
        )}
      </div>
    </>
  )
}
