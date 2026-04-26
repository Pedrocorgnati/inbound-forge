'use client'
// Intake-Review TASK-22 ST006 (CL-TH-055).
import { SearchInput } from '@/components/shared/SearchInput'

export function PatternSearchInput({ className }: { className?: string }) {
  return (
    <SearchInput
      placeholder="Buscar solution pattern..."
      className={className}
      data-testid="pattern-search"
    />
  )
}
