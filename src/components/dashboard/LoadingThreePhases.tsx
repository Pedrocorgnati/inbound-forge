'use client'

import { cn } from '@/lib/utils'

type Phase = 'initial' | 'stream' | 'realtime'

interface LoadingThreePhasesProps {
  phase: Phase
  className?: string
}

const LABEL: Record<Phase, string> = {
  initial: 'Carregando estrutura...',
  stream: 'Preenchendo dados...',
  realtime: 'Conectado em tempo real',
}

export function LoadingThreePhases({ phase, className }: LoadingThreePhasesProps) {
  return (
    <div data-testid="loading-three-phases" className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1">
        {(['initial', 'stream', 'realtime'] as Phase[]).map((p) => (
          <span
            key={p}
            className={cn(
              'h-2 w-2 rounded-full',
              phase === p ? 'bg-primary animate-pulse' : 'bg-muted'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{LABEL[phase]}</span>
    </div>
  )
}
