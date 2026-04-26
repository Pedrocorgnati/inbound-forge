// Intake Review TASK-8 ST002 (CL-220) — vista detalhada de uma dor.
// Exibe header, descricao, setores, tags, cases relacionados + actions.

'use client'

import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelatedItemsList } from './RelatedItemsList'

interface PainCase {
  case?: { id?: string; name?: string; isDraft?: boolean } | null
}

export interface PainDetailViewProps {
  locale: string
  pain: {
    id: string
    title: string
    description?: string | null
    sectors?: string[] | null
    status?: string | null
    relevanceScore?: number | null
    casePains?: PainCase[] | null
  }
  onDelete?: () => void
}

export function PainDetailView({ locale, pain, onDelete }: PainDetailViewProps) {
  const sectors = pain.sectors ?? []
  const cases = (pain.casePains ?? []).map((cp) => cp.case).filter(Boolean) as {
    id?: string
    name?: string
    isDraft?: boolean
  }[]

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{pain.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {pain.status && <Badge variant="info">{pain.status}</Badge>}
            {typeof pain.relevanceScore === 'number' && (
              <Badge variant="default">Relevancia {pain.relevanceScore}</Badge>
            )}
            {sectors.map((s) => (
              <Badge key={s} variant="default">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/${locale}/knowledge/pains/${pain.id}/edit`}>
              <Edit className="h-4 w-4" /> Editar
            </Link>
          </Button>
          {onDelete && (
            <Button variant="default" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Deletar
            </Button>
          )}
        </div>
      </header>

      {pain.description && (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Descrição
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {pain.description}
          </p>
        </section>
      )}

      <RelatedItemsList
        title="Cases relacionados"
        items={cases}
        renderItem={(c) => (
          <Link
            href={`/${locale}/knowledge/cases/${c.id}/edit`}
            className="hover:underline"
          >
            {c.name ?? c.id}
            {c.isDraft && (
              <Badge variant="warning" className="ml-2 text-[10px]">
                Draft
              </Badge>
            )}
          </Link>
        )}
      />
    </article>
  )
}
