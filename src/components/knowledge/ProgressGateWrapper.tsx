'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ProgressCounter } from './ProgressCounter'
import { ThresholdUnlockAnimation } from './ThresholdUnlockAnimation'
import { useKnowledgeProgress } from '@/hooks/useKnowledgeProgress'

interface ProgressGateWrapperProps {
  locale: string
}

const COUNTER_CONFIG = [
  { key: 'cases' as const, label: 'Cases' },
  { key: 'pains' as const, label: 'Dores' },
  { key: 'patterns' as const, label: 'Padrões' },
  { key: 'objections' as const, label: 'Objeções' },
]

export function ProgressGateWrapper({ locale }: ProgressGateWrapperProps) {
  const { data, isLoading, error, justUnlocked } = useKnowledgeProgress()
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    if (justUnlocked) {
      setShowUnlock(true)
    }
  }, [justUnlocked])

  // Loading state
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-border p-4"
        data-testid="progress-gate-loading"
        aria-label="Carregando progresso"
      >
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" className="w-24" />
              <Skeleton variant="rectangle" className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 p-4"
        role="alert"
        data-testid="progress-gate-error"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
        <p className="text-sm text-danger">
          {error ?? 'Erro ao carregar progresso da base de conhecimento.'}
        </p>
      </div>
    )
  }

  const isComplete = data.overallUnlocked

  return (
    <>
      <div
        data-testid="progress-gate"
        className={`rounded-lg border p-4 ${
          isComplete
            ? 'border-success/20 bg-success-bg'
            : 'border-border bg-card'
        }`}
      >
        {/* Mobile: collapsible */}
        <details className="sm:hidden" open>
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            {isComplete
              ? 'Base de conhecimento pronta'
              : 'Progresso da base de conhecimento'}
          </summary>
          <div className="mt-3 space-y-3">
            {COUNTER_CONFIG.map((cfg) => (
              <ProgressCounter
                key={cfg.key}
                label={cfg.label}
                current={data[cfg.key].count}
                threshold={data[cfg.key].threshold}
              />
            ))}
          </div>
        </details>

        {/* Desktop: always visible */}
        <div className="hidden sm:block">
          {isComplete && (
            <p className="mb-3 text-sm font-medium text-success" data-testid="progress-gate-complete">
              Base de conhecimento pronta
            </p>
          )}

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {COUNTER_CONFIG.map((cfg) => (
              <ProgressCounter
                key={cfg.key}
                label={cfg.label}
                current={data[cfg.key].count}
                threshold={data[cfg.key].threshold}
              />
            ))}
          </div>
        </div>

        {/* Nudge message */}
        {data.nextNudge && (
          <p
            className="mt-3 text-xs text-muted-foreground"
            aria-live="polite"
            data-testid="progress-gate-nudge"
          >
            {data.nextNudge}
          </p>
        )}
      </div>

      {/* Unlock animation */}
      <ThresholdUnlockAnimation
        isVisible={showUnlock}
        onDismiss={() => setShowUnlock(false)}
        locale={locale}
      />
    </>
  )
}
