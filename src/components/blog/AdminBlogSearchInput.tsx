'use client'
// Intake-Review TASK-22 ST006 (CL-PB-053): admin panel search wrapper.
// Diferente de BlogSearchInput publico (form GET /blog/search), este usa URL ?search=.
import { SearchInput } from '@/components/shared/SearchInput'

export function AdminBlogSearchInput({ className }: { className?: string }) {
  return (
    <SearchInput
      placeholder="Buscar titulo, slug ou corpo..."
      className={className}
      data-testid="admin-blog-search"
    />
  )
}
