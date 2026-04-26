'use client'

import { useCallback, useEffect, useState } from 'react'
import { ONBOARDING_STEPS, ONBOARDING_STEPS_WITH_META } from '@/constants/onboarding-steps'
import { NudgeBanner } from './NudgeBanner'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { OnboardingState } from '@/types/onboarding'
import { OnboardingProgress } from './OnboardingProgress'
import { OnboardingCarousel } from './OnboardingCarousel'
import { GuidedCarousel } from './GuidedCarousel'
import type { PendingCase, PendingPain } from '@/lib/onboarding/prioritization'
import { WelcomeStep } from './steps/WelcomeStep'
// Intake Review TASK-2 ST003 (CL-029, CL-034): seed defaults CTA no step-1.
import { SeedDefaultsCTA } from './SeedDefaultsCTA'
import { CredentialsStep } from './steps/CredentialsStep'
import { FirstCaseStep } from './steps/FirstCaseStep'
import { PainsStep } from './steps/PainsStep'
import { SolutionsStep } from './steps/SolutionsStep'
import { ObjectionsStep } from './steps/ObjectionsStep'
import { ActivationStep } from './steps/ActivationStep'

const STORAGE_KEY = STORAGE_KEYS.ONBOARDING

function loadState(): OnboardingState {
  if (typeof window === 'undefined') {
    return { currentStep: 1, completedSteps: [], skippedSteps: [], credentialResults: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as OnboardingState
  } catch {
    // ignore corrupted
  }
  return { currentStep: 1, completedSteps: [], skippedSteps: [], credentialResults: [] }
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded — ignore
  }
}

interface OnboardingWizardProps {
  locale: string
}

export function OnboardingWizard({ locale }: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>(loadState)
  const [hydrated, setHydrated] = useState(false)
  const [pendingCases, setPendingCases] = useState<PendingCase[]>([])
  const [pendingPains, setPendingPains] = useState<PendingPain[]>([])

  // Hydrate from localStorage after mount
  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  // Busca entradas pendentes para o GuidedCarousel (CL-022/CL-023).
  // Usa APIs existentes; falha silenciosa se nao autenticado.
  useEffect(() => {
    if (!hydrated) return
    const controller = new AbortController()
    async function load() {
      try {
        const [casesRes, painsRes] = await Promise.all([
          fetch('/api/knowledge/cases?limit=20&status=DRAFT', { signal: controller.signal }),
          fetch('/api/knowledge/pains?limit=20&status=DRAFT', { signal: controller.signal }),
        ])
        if (casesRes.ok) {
          const body = await casesRes.json()
          const items = (body?.data ?? []) as Array<{
            id: string
            name: string
            sector: string
            outcome: string
            hasQuantifiableResult?: boolean
          }>
          setPendingCases(items.map((c) => ({
            id: c.id,
            name: c.name,
            sector: c.sector,
            outcome: c.outcome,
            hasQuantifiableResult: c.hasQuantifiableResult,
          })))
        }
        if (painsRes.ok) {
          const body = await painsRes.json()
          const items = (body?.data ?? []) as Array<{
            id: string
            title: string
            description: string
            sectors?: string[]
          }>
          setPendingPains(items.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            sectors: p.sectors,
          })))
        }
      } catch {
        // ignore — widget opcional
      }
    }
    void load()
    return () => controller.abort()
  }, [hydrated])

  // Persist on state change
  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  const markCompleted = useCallback((stepId: number) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(stepId)
        ? prev.completedSteps
        : [...prev.completedSteps, stepId],
    }))
  }, [])

  const markSkipped = useCallback((stepId: number) => {
    setState((prev) => ({
      ...prev,
      skippedSteps: prev.skippedSteps.includes(stepId)
        ? prev.skippedSteps
        : [...prev.skippedSteps, stepId],
    }))
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, ONBOARDING_STEPS.length),
    }))
  }, [])

  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }))
  }, [])

  const handleStepComplete = useCallback(
    (stepId: number) => {
      markCompleted(stepId)
      goNext()
    },
    [markCompleted, goNext]
  )

  const handleStepSkip = useCallback(
    (stepId: number) => {
      markSkipped(stepId)
      goNext()
    },
    [markSkipped, goNext]
  )

  // Prevent flash of wrong step before hydration
  if (!hydrated) {
    return (
      <div data-testid="onboarding-loading" className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentStepDef = ONBOARDING_STEPS.find((s) => s.id === state.currentStep)
  if (!currentStepDef) return null

  return (
    <div data-testid="onboarding-wizard" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {currentStepDef.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Passo {state.currentStep} de {ONBOARDING_STEPS.length}
        </p>
      </div>

      {/* Carousel guiado (CL-007) */}
      <OnboardingCarousel
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
        cases={pendingCases as unknown as import('@/lib/onboarding/prioritize').PrioritizeCase[]}
      />

      {/* Intake Review TASK-7 ST004 (CL-028) — nudge contextual do step atual */}
      {currentStepDef && (() => {
        const meta = ONBOARDING_STEPS_WITH_META.find((s) => s.id === state.currentStep)
        if (!meta?.suggestion) return null
        return (
          <NudgeBanner
            id={`onboarding-step-${meta.key}`}
            text={meta.suggestion}
          />
        )
      })()}

      {/* Sugestoes priorizadas de entradas a validar (TASK-2, CL-022/CL-023) */}
      {(pendingCases.length > 0 || pendingPains.length > 0) && (
        <GuidedCarousel cases={pendingCases} pains={pendingPains} />
      )}

      {/* Progress dots */}
      <OnboardingProgress
        currentStep={state.currentStep}
        totalSteps={ONBOARDING_STEPS.length}
        completedSteps={state.completedSteps}
      />

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {state.currentStep === 1 && (
          <div className="space-y-4">
            <SeedDefaultsCTA />
            <WelcomeStep onComplete={() => handleStepComplete(1)} />
          </div>
        )}
        {state.currentStep === 2 && (
          <CredentialsStep
            state={state}
            setState={setState}
            onComplete={() => handleStepComplete(2)}
            onBack={goBack}
          />
        )}
        {state.currentStep === 3 && (
          <FirstCaseStep
            onComplete={() => handleStepComplete(3)}
            onBack={goBack}
          />
        )}
        {state.currentStep === 4 && (
          <PainsStep
            onComplete={() => handleStepComplete(4)}
            onBack={goBack}
          />
        )}
        {state.currentStep === 5 && (
          <SolutionsStep
            onComplete={() => handleStepComplete(5)}
            onBack={goBack}
          />
        )}
        {state.currentStep === 6 && (
          <ObjectionsStep
            onComplete={() => handleStepComplete(6)}
            onSkip={() => handleStepSkip(6)}
            onBack={goBack}
          />
        )}
        {state.currentStep === 7 && (
          <ActivationStep locale={locale} onBack={goBack} />
        )}
      </div>
    </div>
  )
}
