'use client'

/**
 * TASK-9/ST002 (CL-208) — Secao "Citado por" para entradas knowledge.
 */
import Link from 'next/link'
import useSWR from 'swr'
import type { KnowledgeType } from '@/lib/services/knowledge-graph.service'

interface Backlink {
  id: string
  type: 'case' | 'theme' | 'pattern'
  slug: string
  title: string
  snippet?: string
}

const HREFS: Record<'case' | 'theme' | 'pattern', (id: string) => string> = {
  case: (id) => `/knowledge/cases/${id}/edit`,
  theme: (id) => `/themes/${id}`,
  pattern: (id) => `/knowledge/patterns/${id}`,
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

interface Props {
  type: KnowledgeType
  id: string
}

export function KnowledgeBacklinks({ type, id }: Props) {
  const { data, isLoading } = useSWR<{ data: Backlink[] }>(
    `/api/v1/knowledge/${id}/backlinks?type=${type}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const backlinks = data?.data ?? []

  return (
    <section className="mt-8 border-t pt-6" data-testid="knowledge-backlinks">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Citado por
      </h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : backlinks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma entrada cita esta ainda.</p>
      ) : (
        <ul className="space-y-2">
          {backlinks.map((ref) => (
            <li key={`${ref.type}-${ref.id}`} className="text-sm">
              <Link href={HREFS[ref.type](ref.id)} className="text-primary hover:underline">
                [{ref.type}] {ref.title}
              </Link>
              {ref.snippet && <p className="text-xs text-muted-foreground">{ref.snippet}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
