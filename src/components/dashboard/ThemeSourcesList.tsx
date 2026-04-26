'use client'

import { ExternalLink, Link2Off } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'

interface Source {
  id: string
  url: string
  title: string | null
  createdAt: string | Date
  scoreContribution: number | null
}

interface ThemeSourcesListProps {
  sources: Source[]
}

export function ThemeSourcesList({ sources }: ThemeSourcesListProps) {
  if (sources.length === 0) {
    return (
      <EmptyState
        icon={<Link2Off className="h-8 w-8" />}
        title="Sem fontes associadas"
        description="Nao encontramos fontes scraping diretamente ligadas a este tema."
      />
    )
  }

  return (
    <ul className="space-y-2" data-testid="theme-sources-list">
      {sources.map((s) => (
        <li
          key={s.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-3"
        >
          <div className="min-w-0">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <span className="truncate">{s.title ?? s.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.url}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(s.createdAt).toLocaleDateString()}
            </p>
          </div>
          {s.scoreContribution !== null && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              +{s.scoreContribution}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
