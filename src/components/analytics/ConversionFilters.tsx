'use client'

// ConversionFilters — filtro combinado periodo+type+attribution para ConversionEvent
// Intake-Review TASK-13 ST003 (CL-TA-043). Sincroniza via URL (?from=&to=&type=&attribution=).

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'CONVERSATION', label: 'Conversa' },
  { value: 'MEETING', label: 'Reuniao' },
  { value: 'PROPOSAL', label: 'Proposta' },
  { value: 'CALENDAR_BOOKING', label: 'Agendamento' },
]

const ATTRIBUTION_OPTIONS = [
  { value: '', label: 'Todas atribuicoes' },
  { value: 'FIRST_TOUCH', label: 'First touch' },
  { value: 'ASSISTED_TOUCH', label: 'Assisted touch' },
]

export function ConversionFilters({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [from, setFrom] = useState(searchParams.get('from') ?? '')
  const [to, setTo] = useState(searchParams.get('to') ?? '')
  const [type, setType] = useState(searchParams.get('type') ?? '')
  const [attribution, setAttribution] = useState(searchParams.get('attribution') ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFrom(searchParams.get('from') ?? '')
    setTo(searchParams.get('to') ?? '')
    setType(searchParams.get('type') ?? '')
    setAttribution(searchParams.get('attribution') ?? '')
  }, [searchParams])

  const apply = () => {
    setError(null)
    if (from && to && new Date(from) > new Date(to)) {
      setError('"De" deve ser anterior a "Ate".')
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of [
      ['from', from],
      ['to', to],
      ['type', type],
      ['attribution', attribution],
    ] as const) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const reset = () => {
    setFrom('')
    setTo('')
    setType('')
    setAttribution('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('from')
    params.delete('to')
    params.delete('type')
    params.delete('attribution')
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
      className={className}
      data-testid="conversion-filters"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-xs">
          De
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="conversion-filters-from"
          />
        </label>
        <label className="flex flex-col text-xs">
          Ate
          <input
            type="date"
            value={to.slice(0, 10)}
            onChange={(e) => setTo(e.target.value ? `${e.target.value}T23:59:59.999Z` : '')}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="conversion-filters-to"
          />
        </label>
        <label className="flex flex-col text-xs">
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="conversion-filters-type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs">
          Atribuicao
          <select
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            className="rounded border bg-background px-2 py-1 text-sm"
            data-testid="conversion-filters-attribution"
          >
            {ATTRIBUTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded border bg-card px-3 py-1 text-sm hover:bg-muted/40"
          data-testid="conversion-filters-apply"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border bg-card px-3 py-1 text-sm hover:bg-muted/40"
          data-testid="conversion-filters-reset"
        >
          Limpar
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
