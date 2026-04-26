'use client'

/**
 * KnowledgeRankingList — Intake Review TASK-12 ST001 (CL-025).
 * Exibe cases e dores ordenados por prioridade (quantifiable first / sectors > 0 first).
 */
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

export interface RankingCase {
  id: string
  title: string
  hasQuantifiableResult?: boolean | null
}

export interface RankingPain {
  id: string
  title: string
  sectors?: string[] | null
}

interface Props {
  cases?: RankingCase[]
  pains?: RankingPain[]
}

function sortCases(items: RankingCase[]): RankingCase[] {
  return [...items].sort((a, b) => {
    const aQ = a.hasQuantifiableResult ? 1 : 0
    const bQ = b.hasQuantifiableResult ? 1 : 0
    return bQ - aQ
  })
}

function sortPains(items: RankingPain[]): RankingPain[] {
  return [...items].sort((a, b) => {
    const aS = (a.sectors?.length ?? 0) > 0 ? 1 : 0
    const bS = (b.sectors?.length ?? 0) > 0 ? 1 : 0
    return bS - aS
  })
}

function PriorityBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
      aria-label="Prioritario"
      data-testid="ranking-priority-badge"
    >
      <Star className="h-3 w-3" aria-hidden />
      Prioritario
    </span>
  )
}

export function KnowledgeRankingList({ cases = [], pains = [] }: Props) {
  const sortedCases = sortCases(cases)
  const sortedPains = sortPains(pains)

  return (
    <div className="space-y-6" data-testid="knowledge-ranking-list">
      {sortedCases.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Cases (por impacto)</h3>
          <ul className="space-y-1.5">
            {sortedCases.map((c) => (
              <li
                key={c.id}
                className={cn(
                  'flex items-center justify-between rounded-md border border-border px-3 py-2',
                  c.hasQuantifiableResult && 'border-primary/30 bg-primary/5',
                )}
              >
                <span className="text-sm">{c.title}</span>
                {c.hasQuantifiableResult && <PriorityBadge />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sortedPains.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Dores (por especificidade)</h3>
          <ul className="space-y-1.5">
            {sortedPains.map((p) => {
              const hasSectors = (p.sectors?.length ?? 0) > 0
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border border-border px-3 py-2',
                    hasSectors && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <span className="text-sm">{p.title}</span>
                  {hasSectors && <PriorityBadge />}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
