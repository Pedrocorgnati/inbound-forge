'use client'

// ScoreBreakdown — popover/tooltip mostrando componentes do score (TASK-5 ST003)
// CL-072: explicabilidade da decisao de scoring para o operador.

import { useState } from 'react'
import type { ThemeScoreBreakdown } from '@/hooks/useThemes'

type Props = {
  breakdown?: ThemeScoreBreakdown | null
  finalScore: number
}

const ROWS: { key: keyof ThemeScoreBreakdown; label: string; format: 'pct' | 'mult' | 'int' }[] = [
  { key: 'painRelevance', label: 'Relevancia da dor', format: 'int' },
  { key: 'caseStrength', label: 'Forca do case', format: 'int' },
  { key: 'recencyBonus', label: 'Bonus de recencia', format: 'pct' },
  { key: 'geoMultiplier', label: 'Multiplicador GEO', format: 'mult' },
  { key: 'asovBonus', label: 'Bonus ASOV', format: 'pct' },
  { key: 'conversionMultiplier', label: 'Multiplicador conversao', format: 'mult' },
]

function formatValue(value: number | undefined, format: 'pct' | 'mult' | 'int'): string {
  if (value === undefined || value === null) return '—'
  if (format === 'pct') return `${(value * 100).toFixed(1)}%`
  if (format === 'mult') return `${value.toFixed(2)}x`
  return String(Math.round(value))
}

export function ScoreBreakdown({ breakdown, finalScore }: Props) {
  const [open, setOpen] = useState(false)
  const computedAt = breakdown?.computedAt ? new Date(breakdown.computedAt).toLocaleString() : null

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="score-breakdown-panel"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted/40"
        data-testid="score-breakdown-toggle"
      >
        Como foi calculado?
      </button>

      {open && (
        <div
          id="score-breakdown-panel"
          role="dialog"
          className="absolute right-0 z-30 mt-1 w-72 rounded border bg-popover p-3 text-sm shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-xs uppercase tracking-wide text-muted-foreground">
              Score breakdown
            </strong>
            <span className="text-base font-semibold tabular-nums">{Math.round(finalScore)}</span>
          </div>

          {!breakdown && (
            <p className="text-xs text-muted-foreground">
              Nenhum breakdown disponivel. Recalcule o score para gerar.
            </p>
          )}

          {breakdown && (
            <ul className="space-y-1">
              {ROWS.map((row) => {
                const v = breakdown[row.key] as number | undefined
                if (v === undefined) return null
                return (
                  <li key={row.key} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="tabular-nums">{formatValue(v, row.format)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          {computedAt && (
            <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
              Calculado em {computedAt}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
