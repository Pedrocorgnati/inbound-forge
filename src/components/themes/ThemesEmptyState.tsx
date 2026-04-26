'use client'

// TASK-5 ST003 — Empty state de temas com motivo explicito.
// Rastreabilidade: CL-212

import Link from 'next/link'
import { Loader2, Target, Filter, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ThemesEmptyReason = 'NO_NICHE' | 'SCRAPING' | 'FILTER_EMPTY' | 'NO_THEMES'

interface ThemesEmptyStateProps {
  reason: ThemesEmptyReason
  onClearFilters?: () => void
}

const COPY: Record<
  ThemesEmptyReason,
  { title: string; description: string; icon: React.ReactNode; cta?: { href?: string; label: string } }
> = {
  NO_NICHE: {
    title: 'Configure seu nicho',
    description: 'Para gerar temas relevantes, definimos primeiro seu nicho de atuacao.',
    icon: <Target className="h-10 w-10 text-primary" aria-hidden />,
    cta: { href: '/settings/preferences', label: 'Configurar nicho' },
  },
  SCRAPING: {
    title: 'Scraping em andamento',
    description:
      'Estamos analisando fontes do seu nicho. Assim que tivermos temas suficientes, eles aparecem aqui.',
    icon: <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />,
  },
  FILTER_EMPTY: {
    title: 'Nenhum tema com esses filtros',
    description: 'Ajuste os filtros ou limpe para ver todos os temas disponiveis.',
    icon: <Filter className="h-10 w-10 text-muted-foreground" aria-hidden />,
    cta: { label: 'Limpar filtros' },
  },
  NO_THEMES: {
    title: 'Sem temas gerados ainda',
    description: 'Gere uma primeira rodada de temas para iniciar.',
    icon: <Sparkles className="h-10 w-10 text-primary" aria-hidden />,
    cta: { href: '/dashboard?generate=1', label: 'Gerar temas' },
  },
}

export function ThemesEmptyState({ reason, onClearFilters }: ThemesEmptyStateProps) {
  const c = COPY[reason]

  return (
    <div
      role="status"
      data-testid="themes-empty-state"
      data-reason={reason}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 p-10 text-center"
    >
      <div className="mb-4">{c.icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{c.title}</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">{c.description}</p>
      {c.cta && (
        c.cta.href ? (
          <Button asChild size="sm">
            <Link href={c.cta.href}>{c.cta.label}</Link>
          </Button>
        ) : (
          <Button size="sm" onClick={onClearFilters}>
            {c.cta.label}
          </Button>
        )
      )}
    </div>
  )
}
