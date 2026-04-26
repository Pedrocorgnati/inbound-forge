'use client'
// Intake-Review TASK-22 ST006 (CL-CG-037). Busca em fileName/originalName/tags.
import { SearchInput } from '@/components/shared/SearchInput'

export function AssetSearchInput({ className }: { className?: string }) {
  return (
    <SearchInput
      placeholder="Buscar nome ou tag..."
      className={className}
      data-testid="asset-search"
    />
  )
}
