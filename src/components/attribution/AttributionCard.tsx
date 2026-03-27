'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AttributionBadge } from '@/components/attribution/AttributionBadge'
import type { AttributionResult } from '@/types/leads'

interface AttributionCardProps {
  leadId: string
  themeId: string
}

interface AttributionResponse {
  leadId: string
  firstTouch: AttributionResult | null
  assisted: AttributionResult[]
  fogApplied: boolean
}

export function AttributionCard({ leadId, themeId }: AttributionCardProps) {
  const [data, setData] = useState<AttributionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)

  const fetchAttribution = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/v1/attribution/${leadId}`)
      if (!res.ok) throw new Error('Falha ao carregar atribuicao')

      const json = await res.json()
      setData(json.data)
    } catch {
      setError('Nao foi possivel carregar a atribuicao.')
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchAttribution()
  }, [fetchAttribution])

  async function handleRecalculate() {
    setIsRecalculating(true)

    try {
      const res = await fetch('/api/v1/attribution/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      })

      if (!res.ok) throw new Error('Falha ao recalcular')

      toast.success('Atribuicao recalculada')
      await fetchAttribution()
    } catch {
      toast.error('Erro ao recalcular atribuicao')
    } finally {
      setIsRecalculating(false)
    }
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <Card variant="elevated" data-testid="attribution-card-loading">
        <CardHeader>
          <CardTitle className="text-base">Atribuicao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="rectangle" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-48" />
        </CardContent>
      </Card>
    )
  }

  // --- Error ---
  if (error) {
    return (
      <Card variant="elevated" data-testid="attribution-card-error">
        <CardHeader>
          <CardTitle className="text-base">Atribuicao</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const firstTouch = data?.firstTouch ?? null
  const assisted = data?.assisted ?? []
  const hasAttribution = firstTouch !== null

  // --- No Attribution ---
  if (!hasAttribution) {
    return (
      <Card variant="elevated" data-testid="attribution-card-empty">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Atribuicao</CardTitle>
          <RecalculateButton
            isRecalculating={isRecalculating}
            onClick={handleRecalculate}
          />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Atribuicao nao determinada — sem UTM link
          </p>
        </CardContent>
      </Card>
    )
  }

  const confidencePercent = Math.round(firstTouch.confidence * 100)

  return (
    <Card variant="elevated" data-testid="attribution-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Atribuicao</CardTitle>
        <RecalculateButton
          isRecalculating={isRecalculating}
          onClick={handleRecalculate}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* First Touch */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AttributionBadge type={firstTouch.inferred ? 'INFERRED' : firstTouch.type} />
            {firstTouch.inferred && (
              <span
                className="text-xs text-muted-foreground italic"
                title="Atribuicao estimada por correlacao de canal e periodo"
                data-testid="attribution-inferred-hint"
              >
                (estimada)
              </span>
            )}
          </div>

          {/* Source info */}
          {firstTouch.source && (
            <div data-testid="attribution-source">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Canal
              </span>
              <p className="text-sm text-foreground">{firstTouch.source}</p>
            </div>
          )}

          {firstTouch.campaign && (
            <div data-testid="attribution-campaign">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Campanha
              </span>
              <p className="text-sm text-foreground">{firstTouch.campaign}</p>
            </div>
          )}

          {/* Confidence bar */}
          <div data-testid="attribution-confidence">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Confianca
            </span>
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-2 flex-1 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={confidencePercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${confidencePercent}% de confianca`}
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground tabular-nums w-10 text-right">
                {confidencePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Assisted touches */}
        {assisted.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3" data-testid="attribution-assisted">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Toques Assistidos
            </span>
            <ul className="space-y-1">
              {assisted.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <AttributionBadge type={a.inferred ? 'INFERRED' : a.type} />
                  {a.source && (
                    <span className="text-xs text-muted-foreground">{a.source}</span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(a.confidence * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Internal sub-component ---

function RecalculateButton({
  isRecalculating,
  onClick,
}: {
  isRecalculating: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      isLoading={isRecalculating}
      loadingText="Recalculando..."
      data-testid="attribution-recalculate"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      Recalcular
    </Button>
  )
}
