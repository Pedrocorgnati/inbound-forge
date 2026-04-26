'use client'

/**
 * SeedDefaultsCTA — Intake Review TASK-2 ST003 (CL-029, CL-034)
 *
 * Oferece seed das 10 dores MVP pre-configuradas no primeiro passo do
 * onboarding. Aparece somente quando nao ha dores default ainda seedeadas.
 * Acao e idempotente: chama POST /api/v1/onboarding/seed-defaults.
 */
import { useCallback, useEffect, useState } from 'react'

type Status = 'idle' | 'checking' | 'seeding' | 'done' | 'error' | 'hidden'

export function SeedDefaultsCTA() {
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState<string>('')

  // Checa se ja existe base pre-configurada (evita oferecer botao redundante).
  useEffect(() => {
    let cancelled = false
    async function probe() {
      try {
        const res = await fetch('/api/v1/onboarding/progress', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setStatus('idle')
          return
        }
        const body = (await res.json()) as { counts?: { pains?: number } }
        const pains = body.counts?.pains ?? 0
        if (cancelled) return
        setStatus(pains >= 10 ? 'hidden' : 'idle')
      } catch {
        if (!cancelled) setStatus('idle')
      }
    }
    void probe()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSeed = useCallback(async () => {
    setStatus('seeding')
    setMessage('')
    try {
      const res = await fetch('/api/v1/onboarding/seed-defaults', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.text().catch(() => '')
        setStatus('error')
        setMessage(err || `Falha (${res.status})`)
        return
      }
      const body = (await res.json()) as {
        inserted: number
        existing: number
        total: number
      }
      setStatus('done')
      setMessage(
        `${body.inserted} dores inseridas, ${body.existing} ja existiam (total: ${body.total}).`
      )
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [])

  if (status === 'hidden') return null

  return (
    <div
      data-testid="seed-defaults-cta"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
    >
      <div>
        <p className="font-medium text-foreground">
          Usar 10 dores pre-configuradas
        </p>
        <p className="text-xs text-muted-foreground">
          Importa a biblioteca MVP para acelerar seu onboarding. E idempotente —
          pode rodar de novo sem duplicar.
        </p>
        {message && (
          <p
            className={
              status === 'error'
                ? 'mt-1 text-xs text-destructive'
                : 'mt-1 text-xs text-emerald-600'
            }
            data-testid="seed-defaults-feedback"
          >
            {message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSeed}
        disabled={status === 'seeding' || status === 'done' || status === 'checking'}
        data-testid="seed-defaults-button"
        className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'seeding'
          ? 'Importando...'
          : status === 'done'
            ? 'Importado'
            : status === 'checking'
              ? 'Verificando...'
              : 'Importar base'}
      </button>
    </div>
  )
}
