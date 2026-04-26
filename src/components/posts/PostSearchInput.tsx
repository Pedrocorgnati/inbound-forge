'use client'
// Intake-Review TASK-22 ST006 (CL-PB-052).
import { SearchInput } from '@/components/shared/SearchInput'

export function PostSearchInput({ className }: { className?: string }) {
  return (
    <SearchInput
      placeholder="Buscar em caption..."
      className={className}
      data-testid="post-search"
    />
  )
}
