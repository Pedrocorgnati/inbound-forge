// Intake Review TASK-8 ST005 (CL-220/CL-224) — lista reutilizavel de items
// relacionados. Exibe EmptyState quando vazia.

import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export interface RelatedItemsListProps<T> {
  title: string
  items: T[] | null | undefined
  renderItem: (item: T, index: number) => ReactNode
  emptyMessage?: string
  className?: string
}

export function RelatedItemsList<T>({
  title,
  items,
  renderItem,
  emptyMessage,
  className,
}: RelatedItemsListProps<T>) {
  const list = Array.isArray(items) ? items : []
  return (
    <section className={className}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="font-normal text-foreground/60">({list.length})</span>
      </h2>
      {list.length === 0 ? (
        <EmptyState title={emptyMessage ?? `Sem ${title.toLowerCase()} vinculados`} />
      ) : (
        <ul className="space-y-2" data-testid={`related-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {list.map((item, idx) => (
            <li key={idx} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
              {renderItem(item, idx)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
