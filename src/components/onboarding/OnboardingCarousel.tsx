'use client'

// OnboardingCarousel — Carousel guiado com sugestoes de proximas entradas
// Rastreabilidade: CL-007, TASK-1 ST002

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ONBOARDING_STEPS_WITH_META } from '@/constants/onboarding-steps'
import { prioritize, type PrioritizeCase } from '@/lib/onboarding/prioritize'

interface OnboardingCarouselProps {
  currentStep: number
  completedSteps?: number[]
  className?: string
  // Intake Review TASK-7 ST002/ST005 (CL-027): permite reordenar por prioridade
  // de desbloqueio. Quando fornecido, passos incompletos e com cases
  // quantificaveis aparecem primeiro.
  cases?: PrioritizeCase[]
}

export function OnboardingCarousel({
  currentStep,
  completedSteps = [],
  className,
  cases,
}: OnboardingCarouselProps) {
  // Intake Review TASK-7 ST002 (CL-027): ordem reativa por prioridade.
  const orderedSteps = useMemo(() => {
    const annotated = ONBOARDING_STEPS_WITH_META.map((s) => ({
      ...s,
      done: completedSteps.includes(s.id),
    }))
    return prioritize(annotated, { cases })
  }, [completedSteps, cases])

  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, orderedSteps.findIndex((s) => s.id === currentStep))
  )

  const total = orderedSteps.length

  function prev() {
    setActiveIndex((i) => Math.max(0, i - 1))
  }

  function next() {
    setActiveIndex((i) => Math.min(total - 1, i + 1))
  }

  const step = orderedSteps[activeIndex]

  return (
    <div
      data-testid="onboarding-carousel"
      className={`rounded-lg border border-border bg-muted/30 p-4 ${className ?? ''}`}
    >
      {/* Step dots */}
      <ol className="flex items-center justify-center gap-2 mb-4" role="list">
        {orderedSteps.map((s, idx) => {
          const isCompleted = completedSteps.includes(s.id)
          const isCurrent = s.id === currentStep
          return (
            <li
              key={s.id}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCompleted
                  ? 'bg-green-500/20 text-green-600'
                  : isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : idx === activeIndex
                  ? 'bg-primary/20 text-primary ring-1 ring-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
              aria-current={idx === activeIndex ? 'step' : undefined}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span>{s.id}</span>
              )}
            </li>
          )
        })}
      </ol>

      {/* Slide content */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={prev}
          disabled={activeIndex === 0}
          aria-label="Passo anterior"
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 text-center space-y-1 min-h-[64px]">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            Passo {step.id} de {total}
          </p>
          <p className="text-sm font-medium text-foreground">{step.title}</p>
          {step.suggestion && (
            <p className="text-xs text-muted-foreground">{step.suggestion}</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          disabled={activeIndex === total - 1}
          aria-label="Próximo passo"
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Indicador de posição (dots) */}
      <div className="mt-3 flex justify-center gap-1" role="presentation">
        {ONBOARDING_STEPS_WITH_META.map((_, idx) => (
          <Circle
            key={idx}
            className={`h-1.5 w-1.5 transition-colors ${
              idx === activeIndex ? 'fill-primary text-primary' : 'fill-muted-foreground/40 text-muted-foreground/40'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
