'use client'

import { FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface ThemesFilterState {
  painCategory: string
  scoreMin: string
  scoreMax: string
  source: '' | 'rss' | 'scraping' | 'manual'
  dateFrom: string
  dateTo: string
}

interface ThemesFiltersProps {
  filters: ThemesFilterState
  onChange: (filters: ThemesFilterState) => void
  onClear: () => void
}

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'rss', label: 'RSS' },
  { value: 'scraping', label: 'Scraping' },
  { value: 'manual', label: 'Manual' },
]

export function ThemesFilters({ filters, onChange, onClear }: ThemesFiltersProps) {
  const hasFilters = Object.values(filters).some(Boolean)

  function patch(key: keyof ThemesFilterState, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div
      className="grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
      data-testid="themes-filters"
    >
      <Input
        id="themes-filter-pain"
        label="Dor associada"
        value={filters.painCategory}
        onChange={(event) => patch('painCategory', event.target.value)}
        placeholder="Ex: retrabalho, atendimento"
      />
      <Input
        id="themes-filter-score-min"
        label="Score min."
        type="number"
        min={0}
        max={100}
        value={filters.scoreMin}
        onChange={(event) => patch('scoreMin', event.target.value)}
      />
      <Input
        id="themes-filter-score-max"
        label="Score max."
        type="number"
        min={0}
        max={100}
        value={filters.scoreMax}
        onChange={(event) => patch('scoreMax', event.target.value)}
      />
      <Select
        id="themes-filter-source"
        label="Fonte"
        value={filters.source}
        onChange={(event) => patch('source', event.target.value)}
        options={SOURCE_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-1">
        <Input
          id="themes-filter-date-from"
          label="De"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => patch('dateFrom', event.target.value)}
        />
        <Input
          id="themes-filter-date-to"
          label="Ate"
          type="date"
          value={filters.dateTo}
          onChange={(event) => patch('dateTo', event.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onClear}
          disabled={!hasFilters}
          data-testid="themes-clear-filters"
        >
          <FilterX className="h-4 w-4" aria-hidden />
          Limpar
        </Button>
      </div>
    </div>
  )
}
