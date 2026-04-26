'use client'

// ContextualNudge — nudge explicando beneficio de validar uma entrada (TASK-2 ST002, CL-023).

import { Lightbulb } from 'lucide-react'

interface ContextualNudgeProps {
  type: 'case' | 'pain'
  themesUnlockedEstimate: number
  sector?: string
  className?: string
}

export function ContextualNudge({
  type,
  themesUnlockedEstimate,
  sector,
  className,
}: ContextualNudgeProps) {
  const domain = sector ?? (type === 'case' ? 'seu nicho' : 'setores relacionados')
  const kind = type === 'case' ? 'case' : 'dor'

  return (
    <div
      data-testid="contextual-nudge"
      data-nudge-type={type}
      className={`flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs ${className ?? ''}`}
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-muted-foreground">
        Validar este {kind} libera{' '}
        <span className="font-semibold text-foreground">~{themesUnlockedEstimate} temas</span>{' '}
        relacionados a <span className="font-medium text-foreground">{domain}</span>.
      </p>
    </div>
  )
}
