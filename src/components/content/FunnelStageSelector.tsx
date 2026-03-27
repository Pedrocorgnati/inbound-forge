'use client'

import type { FunnelStage } from '@prisma/client'
import { Select } from '@/components/ui/select'

const FUNNEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'AWARENESS', label: 'Topo — Consciência' },
  { value: 'CONSIDERATION', label: 'Meio — Consideração' },
  { value: 'DECISION', label: 'Fundo — Decisão' },
]

interface FunnelStageSelectorProps {
  value: FunnelStage
  onChange: (stage: FunnelStage) => void
  disabled?: boolean
  className?: string
}

export function FunnelStageSelector({ value, onChange, disabled, className }: FunnelStageSelectorProps) {
  return (
    <Select
      options={FUNNEL_OPTIONS}
      value={value}
      onChange={(e) => onChange(e.target.value as FunnelStage)}
      disabled={disabled}
      label="Estágio do funil"
      aria-label="Estágio do funil"
      className={className}
      data-testid="funnel-stage-selector"
    />
  )
}
