'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { FilterChip } from './filter-chip'

export interface FilterItem {
  key: string
  label: string
  value: string
}

export interface FilterBarProps {
  filters: FilterItem[]
  onRemove: (key: string) => void
  onClearAll: () => void
  className?: string
}

export function FilterBar({ filters, onRemove, onClearAll, className }: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={`${filter.label}: ${filter.value}`}
          onRemove={() => onRemove(filter.key)}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-xs text-muted-foreground"
      >
        Limpar tudo
      </Button>
    </div>
  )
}
