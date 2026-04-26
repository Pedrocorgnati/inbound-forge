'use client'

/**
 * TASK-11 ST005 (CL-TA-041): wrapper de SearchInput para /leads.
 */
import { SearchInput } from '@/components/shared/SearchInput'

export function LeadSearchInput() {
  return (
    <SearchInput
      placeholder="Buscar por nome ou empresa..."
      data-testid="lead-search-input"
    />
  )
}
