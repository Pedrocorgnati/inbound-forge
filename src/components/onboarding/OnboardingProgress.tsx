'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  completedSteps: number[]
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  completedSteps,
}: OnboardingProgressProps) {
  return (
    <div
      data-testid="onboarding-progress"
      className="flex items-center justify-center gap-0"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Passo ${currentStep} de ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepId = i + 1
        const isCompleted = completedSteps.includes(stepId)
        const isCurrent = stepId === currentStep
        const isPending = !isCompleted && !isCurrent

        return (
          <div key={stepId} className="flex items-center">
            {/* Dot */}
            <div
              data-testid={`progress-dot-${stepId}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'border-2 border-primary bg-background text-primary',
                isPending && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" aria-label="Concluído" />
              ) : (
                stepId
              )}
            </div>

            {/* Connector line */}
            {stepId < totalSteps && (
              <div
                className={cn(
                  'h-0.5 w-6 transition-colors sm:w-8',
                  isCompleted ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
