'use client'

// Intake-Review TASK-5 ST002 (CL-225): campo configuravel para threshold de custo USD.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Props {
  initialThresholdUsd: number
  initialCurrentSpendUsd: number
}

export function CostThresholdField({
  initialThresholdUsd,
  initialCurrentSpendUsd,
}: Props) {
  const [value, setValue] = useState<number>(initialThresholdUsd)
  const [saving, setSaving] = useState(false)
  const [currentSpend, setCurrentSpend] = useState<number>(initialCurrentSpendUsd)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDirty(value !== initialThresholdUsd)
  }, [value, initialThresholdUsd])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/v1/settings/cost-threshold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyCostThresholdUsd: value }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Falha (status ${res.status})`)
      }
      toast.success('Threshold atualizado')
      setDirty(false)

      // Refresca consumo atual
      const refreshed = await fetch('/api/v1/settings/cost-threshold').then((r) => r.json()).catch(() => null)
      if (refreshed?.data?.currentSpendUsd !== undefined) {
        setCurrentSpend(refreshed.data.currentSpendUsd)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar threshold')
    } finally {
      setSaving(false)
    }
  }

  const exceeded = value > 0 && currentSpend >= value

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-3" data-testid="cost-threshold-field">
      <div className="space-y-1">
        <label htmlFor="monthlyCostThresholdUsd" className="block text-sm font-medium">
          Threshold mensal de custo (US$)
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">US$</span>
          <input
            id="monthlyCostThresholdUsd"
            type="number"
            min={0}
            max={1000}
            step={0.01}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-32 rounded-md border border-border bg-background px-3 py-2"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              exceeded ? 'bg-destructive/20 text-destructive' : 'bg-muted'
            }`}
            title="Consumo acumulado no mes atual"
          >
            Atual: US${currentSpend.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Limite mensal de custo em USD. 0 = desabilitado.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving || !dirty}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {saving ? 'Salvando...' : 'Salvar threshold'}
      </button>
    </form>
  )
}
