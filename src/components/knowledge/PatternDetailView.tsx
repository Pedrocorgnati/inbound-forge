// Intake Review TASK-8 ST004 (CL-224) — vista detalhada de solution pattern.

'use client'

import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelatedItemsList } from './RelatedItemsList'

export interface PatternDetailViewProps {
  locale: string
  pattern: {
    id: string
    name: string
    description?: string | null
    steps?: unknown
    pains?: { id?: string; title?: string }[] | null
    cases?: { id?: string; name?: string }[] | null
    versions?: { id?: string; version?: number | string; createdAt?: string | Date }[] | null
    status?: string | null
  }
  onDelete?: () => void
}

function renderSteps(steps: unknown) {
  if (!steps) return null
  const arr = Array.isArray(steps)
    ? steps
    : typeof steps === 'string'
      ? steps.split(/\n+/).filter(Boolean)
      : null
  if (!arr || arr.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Passos
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {arr.map((s, idx) => (
          <li key={idx}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>
        ))}
      </ol>
    </section>
  )
}

export function PatternDetailView({ locale, pattern, onDelete }: PatternDetailViewProps) {
  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{pattern.name}</h1>
          {pattern.status && (
            <Badge variant="info" className="mt-2">
              {pattern.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/knowledge/patterns/${pattern.id}/edit`}>
              <Edit className="h-4 w-4" /> Editar
            </Link>
          </Button>
          {onDelete && (
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Deletar
            </Button>
          )}
        </div>
      </header>

      {pattern.description && (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Descrição
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {pattern.description}
          </p>
        </section>
      )}

      {renderSteps(pattern.steps)}

      <RelatedItemsList
        title="Dores atendidas"
        items={pattern.pains ?? []}
        renderItem={(p) => (
          <Link
            href={`/${locale}/knowledge/pains/${p.id}`}
            className="hover:underline"
          >
            {p.title ?? p.id}
          </Link>
        )}
      />

      <RelatedItemsList
        title="Cases de prova"
        items={pattern.cases ?? []}
        renderItem={(c) => (
          <Link
            href={`/${locale}/knowledge/cases/${c.id}/edit`}
            className="hover:underline"
          >
            {c.name ?? c.id}
          </Link>
        )}
      />

      <RelatedItemsList
        title="Versões"
        items={pattern.versions ?? []}
        renderItem={(v) => (
          <span>
            v{String(v.version ?? '?')}
            {v.createdAt && (
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString()}
              </span>
            )}
          </span>
        )}
      />
    </article>
  )
}
