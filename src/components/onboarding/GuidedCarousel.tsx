'use client'

// GuidedCarousel — carousel de entradas pendentes priorizadas (TASK-2 ST002, CL-022/CL-023).
// Ordena cases + pains por potencial de destravar temas e exibe nudge contextual.

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  prioritizePendingEntries,
  type PendingCase,
  type PendingPain,
  type PrioritizedEntry,
} from '@/lib/onboarding/prioritization'
import { ContextualNudge } from './ContextualNudge'

interface GuidedCarouselProps {
  cases: PendingCase[]
  pains: PendingPain[]
  onValidate?: (entry: PrioritizedEntry) => void
  className?: string
}

export function GuidedCarousel({
  cases,
  pains,
  onValidate,
  className,
}: GuidedCarouselProps) {
  const prioritized = useMemo(
    () => prioritizePendingEntries(cases, pains),
    [cases, pains]
  )
  const [index, setIndex] = useState(0)
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set())

  const visible = prioritized.filter((p) => !validatedIds.has(p.entry.id))
  const safeIndex = Math.min(index, Math.max(0, visible.length - 1))
  const current = visible[safeIndex]

  if (!current) {
    return (
      <div
        data-testid="guided-carousel-empty"
        className={`rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground ${className ?? ''}`}
      >
        Nenhuma entrada pendente. Cadastre cases e dores para receber sugestoes priorizadas.
      </div>
    )
  }

  const title =
    current.type === 'case'
      ? (current.entry as PendingCase).name
      : (current.entry as PendingPain).title
  const sector =
    current.type === 'case'
      ? (current.entry as PendingCase).sector
      : (current.entry as PendingPain).sectors?.[0]

  function prev() {
    setIndex((i) => Math.max(0, i - 1))
  }
  function next() {
    setIndex((i) => Math.min(visible.length - 1, i + 1))
  }
  function handleValidate() {
    setValidatedIds((prev) => new Set(prev).add(current.entry.id))
    onValidate?.(current)
  }

  return (
    <div
      data-testid="guided-carousel"
      data-entry-type={current.type}
      className={`rounded-lg border border-border bg-card p-4 space-y-3 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Proximo a validar ({safeIndex + 1}/{visible.length})
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={safeIndex === 0}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={safeIndex >= visible.length - 1}
            aria-label="Proximo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {current.type === 'case' ? 'Case' : 'Dor'}
          {sector ? ` · ${sector}` : ''}
        </p>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>

      <ContextualNudge
        type={current.type}
        themesUnlockedEstimate={current.themesUnlockedEstimate}
        sector={sector}
      />

      <Button
        size="sm"
        onClick={handleValidate}
        data-testid="guided-carousel-validate"
        className="w-full"
      >
        Validar agora
      </Button>
    </div>
  )
}
