'use client'
// Intake-Review TASK-22 ST006 (CL-TH-054).
import { SearchInput } from '@/components/shared/SearchInput'

export function PainSearchInput({ className }: { className?: string }) {
  return (
    <SearchInput
      placeholder="Buscar pain (titulo ou descricao)..."
      className={className}
      data-testid="pain-search"
    />
  )
}
