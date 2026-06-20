'use client'
/**
 * Rastreabilidade: CL-108, TASK-5 ST004
 * Badge de uso de quota por provider com progress bar colorida.
 * Verde <50%, Amarelo 50-80%, Vermelho >80%.
 */
import { useEffect, useState } from 'react'

interface QuotaData {
  provider: string
  used: number
  limit: number
  remaining: number
  pct: number
  allowed: boolean
}

interface QuotasResponse {
  providers: Record<string, QuotaData>
}

function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-destructive'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-emerald-500'
}

function ProviderBar({ data }: { data: QuotaData }) {
  const pct = Math.min(100, data.pct)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize font-medium">{data.provider}</span>
        <span className="text-muted-foreground">
          {data.used}/{data.limit} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${progressColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!data.allowed && (
        <p className="text-xs text-destructive">Quota excedida — calls bloqueadas</p>
      )}
    </div>
  )
}

export function QuotaWidget() {
  const [quotas, setQuotas] = useState<QuotasResponse | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/cost/quotas')
      .then(async (r) => {
        // Um 500 retorna JSON válido sem `providers`; tratar como erro explícito
        // em vez de deixar o render quebrar (Zero Estados Indefinidos).
        if (!r.ok) throw new Error('quotas request failed')
        return (await r.json()) as QuotasResponse
      })
      .then((data) => {
        if (!data?.providers) throw new Error('quotas payload inválido')
        setQuotas(data)
      })
      .catch(() => setError(true))
  }, [])

  if (error) return null
  if (!quotas) {
    return (
      <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
        Carregando quotas...
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3" data-testid="quota-widget">
      <h3 className="text-sm font-medium">Quota de Imagens (mês atual)</h3>
      {Object.values(quotas.providers ?? {}).map((p) => (
        <ProviderBar key={p.provider} data={p} />
      ))}
    </div>
  )
}
