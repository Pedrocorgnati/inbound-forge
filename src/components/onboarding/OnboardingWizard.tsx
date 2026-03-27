'use client'

import { useCallback, useEffect, useState } from 'react'
import { ONBOARDING_STEPS } from '@/constants/onboarding-steps'
import type { OnboardingState } from '@/types/onboarding'
import { OnboardingProgress } from './OnboardingProgress'
import { WelcomeStep } from './steps/WelcomeStep'
import { CredentialsStep } from './steps/CredentialsStep'
import { FirstCaseStep } from './steps/FirstCaseStep'
import { PainsStep } from './steps/PainsStep'
import { SolutionsStep } from './steps/SolutionsStep'
import { ObjectionsStep } from './steps/ObjectionsStep'
import { ActivationStep } from './steps/ActivationStep'

const STORAGE_KEY = 'inbound-forge-onboarding'

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

  // Hydrate from localStorage after mount
  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

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

      {/* Progress dots */}
      <OnboardingProgress
        currentStep={state.currentStep}
        totalSteps={ONBOARDING_STEPS.length}
        completedSteps={state.completedSteps}
      />

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {state.currentStep === 1 && (
          <WelcomeStep onComplete={() => handleStepComplete(1)} />
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
