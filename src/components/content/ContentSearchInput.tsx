'use client'

/**
 * TASK-11 ST005 (CL-CS-034): wrapper de SearchInput para /content.
 */
import { SearchInput } from '@/components/shared/SearchInput'

export function ContentSearchInput() {
  return (
    <SearchInput
      placeholder="Buscar em titulos e corpo de conteudos..."
      data-testid="content-search-input"
    />
  )
}
