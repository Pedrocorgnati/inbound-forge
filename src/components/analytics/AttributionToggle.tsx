'use client'

// CL-178 (TASK-11 ST003) — Toggle de modelo de atribuicao multi-touch
// Permite alternar entre FIRST_TOUCH, LAST_TOUCH, LINEAR
// Busca dados de /api/v1/analytics/attribution?model=...&period=...

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnalyticsPeriod } from '@/types/analytics'

type AttributionModel = 'FIRST_TOUCH' | 'LAST_TOUCH' | 'LINEAR'

interface AttributionEntry {
  source: string
  medium: string | null
  campaign: string | null
  conversions: number
  weight: number
}

interface AttributionData {
  model: AttributionModel
  period: string
  entries: AttributionEntry[]
}

const MODEL_LABELS: Record<AttributionModel, string> = {
  FIRST_TOUCH: 'Primeiro toque',
  LAST_TOUCH: 'Último toque',
  LINEAR: 'Linear',
}

interface AttributionToggleProps {
  period: AnalyticsPeriod
  className?: string
}

export function AttributionToggle({ period, className }: AttributionToggleProps) {
  const [model, setModel] = useState<AttributionModel>('FIRST_TOUCH')
  const [data, setData] = useState<AttributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/v1/analytics/attribution?model=${model}&period=${period}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.success) {
          setData(json.data as AttributionData)
        } else {
          setError(new Error(json.error ?? 'Erro ao buscar atribuição'))
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error('Erro de rede'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [model, period])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Model toggle */}
      <div role="group" aria-label="Modelo de atribuição" className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        {(Object.keys(MODEL_LABELS) as AttributionModel[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModel(m)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              model === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={model === m}
          >
            {MODEL_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="space-y-2" role="status" aria-label="Carregando atribuição...">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}

      {!loading && !error && data && data.entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sem dados de atribuição para o período selecionado.
        </p>
      )}

      {!loading && !error && data && data.entries.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Fonte / Canal</th>
              <th className="pb-2 font-medium text-right">Conversões</th>
              <th className="pb-2 font-medium text-right">Peso</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.map((entry, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2">
                  <span className="font-medium">{entry.source}</span>
                  {entry.medium && (
                    <span className="ml-1 text-xs text-muted-foreground">/ {entry.medium}</span>
                  )}
                  {entry.campaign && (
                    <span className="ml-1 text-xs text-muted-foreground truncate max-w-[120px] inline-block align-bottom">
                      ({entry.campaign})
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{entry.conversions}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">
                  {(entry.weight * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
