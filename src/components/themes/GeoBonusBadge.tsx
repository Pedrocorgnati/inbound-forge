'use client'

// Intake Review TASK-5 ST002 (CL-170) — badge visual do bonus GEO.
// Renderiza "GEO +X%" com tooltip explicando os criterios (titulo pergunta,
// dado quantitativo, comparacao). Nao renderiza quando bonus <= 0.

import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface GeoBonusBadgeProps {
  bonus: number
  isQuestion?: boolean
  hasData?: boolean
  isComparison?: boolean
  className?: string
}

function formatPercent(bonus: number): string {
  if (bonus <= 1) return `${Math.round(bonus * 100)}%`
  return `${Math.round(bonus)}%`
}

export function GeoBonusBadge({
  bonus,
  isQuestion,
  hasData,
  isComparison,
  className,
}: GeoBonusBadgeProps) {
  if (!bonus || bonus <= 0) return null

  const tooltipLines: string[] = []
  if (isQuestion) tooltipLines.push('Título em formato de pergunta')
  if (hasData) tooltipLines.push('Dado quantitativo identificado')
  if (isComparison) tooltipLines.push('Comparação / versus')
  if (tooltipLines.length === 0) {
    tooltipLines.push('Bonus por potencial de citação em IA generativa')
  }

  const label = `GEO +${formatPercent(bonus)}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="info"
            className={`gap-1 ${className ?? ''}`}
            data-testid="geo-bonus-badge"
            aria-label={`${label} — potencial de citação por IA`}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="list-disc pl-4 text-xs">
            {tooltipLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
