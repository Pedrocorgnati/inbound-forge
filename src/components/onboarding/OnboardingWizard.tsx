'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ONBOARDING_STEPS, ONBOARDING_STEPS_WITH_META } from '@/constants/onboarding-steps'
import { useOnboardingStepQuery } from '@/app/[locale]/(onboarding)/onboarding/_hooks/use-onboarding-step-query'
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
  const [skipBusy, setSkipBusy] = useState(false)

  // Task 022 (loop 05-27): deep-link via ?step=N. O hook deriva o passo; o wizard (consumidor)
  // exibe o toast e limpa a URL no caso de redirect. Aplicado uma unica vez apos a hidratacao.
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepQuery = useOnboardingStepQuery()
  const deepLinkAppliedRef = useRef(false)

  useEffect(() => {
    if (!hydrated || stepQuery.isLoading || deepLinkAppliedRef.current) return
    // So intervem quando ha um parametro ?step explicito na URL.
    if (searchParams.get('step') === null) return

    deepLinkAppliedRef.current = true

    if (stepQuery.toastMessage) {
      toast.info(stepQuery.toastMessage)
    }

    const target = stepQuery.redirectTo ?? stepQuery.currentStep
    setState((prev) => ({ ...prev, currentStep: target }))

    // Redirect (parametro invalido/bloqueado): limpa o ?step da URL para evitar re-trigger.
    if (stepQuery.redirectTo !== null) {
      router.replace(`/${locale}/onboarding`)
    }
  }, [hydrated, stepQuery, searchParams, router, locale])

  // CL-249 (TASK-12 ST002) — Hidratar do DB + localStorage, DB é fonte de verdade para step.
  useEffect(() => {
    const local = loadState()
    setState(local)
    setHydrated(true)

    async function syncFromDB() {
      try {
        const res = await fetch('/api/onboarding/state')
        if (!res.ok) return
        const json = await res.json()
        const dbStep: number = json.data?.step ?? 0
        if (dbStep > 0) {
          // Usa updater funcional para (a) nao fechar em cima de `local` stale e
          // (b) ceder ao deep-link quando ele ja tiver sido aplicado pelo outro efeito.
          setState((prev) => {
            if (deepLinkAppliedRef.current) return prev
            return dbStep > prev.currentStep ? { ...prev, currentStep: dbStep } : prev
          })
        }
      } catch {
        // DB sync falhou silenciosamente — localStorage prevalece
      }
    }
    void syncFromDB()
  }, [])

  // CL-249 — Persiste step atual no DB quando muda
  const persistStepDB = useCallback(async (step: number) => {
    try {
      await fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', step }),
      })
    } catch {
      // fire-and-forget, falha silenciosa
    }
  }, [])

  // CL-249 — Skip global do onboarding
  const handleSkipAll = useCallback(async () => {
    setSkipBusy(true)
    try {
      await fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip' }),
      })
      window.location.href = `/${locale}/dashboard`
    } catch {
      setSkipBusy(false)
    }
  }, [locale])

  // Busca entradas pendentes para o GuidedCarousel (CL-022/CL-023).
  // Usa APIs existentes; falha silenciosa se nao autenticado.
  useEffect(() => {
    if (!hydrated) return
    const controller = new AbortController()
    async function load() {
      try {
        const [casesRes, painsRes] = await Promise.all([
          fetch('/api/v1/knowledge/cases?limit=20&status=DRAFT', { signal: controller.signal }),
          fetch('/api/v1/knowledge/pains?limit=20&status=DRAFT', { signal: controller.signal }),
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
      void persistStepDB(stepId + 1)
    },
    [markCompleted, goNext, persistStepDB]
  )

  const handleStepSkip = useCallback(
    (stepId: number) => {
      markSkipped(stepId)
      goNext()
      void persistStepDB(stepId + 1)
    },
    [markSkipped, goNext, persistStepDB]
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
      {/* Header — CL-249 (TASK-12 ST002): botao "Pular onboarding" */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {currentStepDef.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Passo {state.currentStep} de {ONBOARDING_STEPS.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSkipAll()}
          disabled={skipBusy}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
          aria-label="Pular onboarding e ir para o dashboard"
        >
          {skipBusy ? 'Redirecionando...' : 'Pular onboarding'}
        </button>
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
