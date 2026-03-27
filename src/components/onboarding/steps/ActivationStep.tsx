'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface Counts {
  cases: number
  pains: number
  solutions: number
}

interface ActivationStepProps {
  locale: string
  onBack: () => void
}

const STORAGE_KEY = 'inbound-forge-onboarding'

export function ActivationStep({ locale, onBack }: ActivationStepProps) {
  const router = useRouter()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/v1/onboarding/progress')
        if (res.ok) {
          const data = await res.json() as { counts: Counts }
          setCounts(data.counts)
        }
      } catch {
        toast.error('Erro ao verificar progresso')
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  const casesOk = (counts?.cases ?? 0) >= 1
  const painsOk = (counts?.pains ?? 0) >= 3
  const patternsOk = (counts?.solutions ?? 0) >= 1
  const allMet = casesOk && painsOk && patternsOk

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch('/api/v1/onboarding/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Erro ao ativar')
      }

      setActivated(true)
      toast.success('Onboarding concluido com sucesso!')

      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }

      // Redirect after celebration
      setTimeout(() => {
        router.push(`/${locale}/dashboard`)
      }, 2500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ativar')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div data-testid="activation-step-loading" className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (activated) {
    return (
      <div data-testid="activation-celebration" className="flex flex-col items-center gap-6 py-8">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-12 w-12 text-primary" />
          </div>
          {/* Confetti-like decorative dots */}
          <div className="absolute -top-2 -left-2 h-3 w-3 rounded-full bg-primary animate-ping" />
          <div className="absolute -top-1 -right-3 h-2 w-2 rounded-full bg-green-500 animate-ping [animation-delay:200ms]" />
          <div className="absolute -bottom-1 -left-3 h-2 w-2 rounded-full bg-yellow-500 animate-ping [animation-delay:400ms]" />
          <div className="absolute -bottom-2 -right-1 h-3 w-3 rounded-full bg-blue-500 animate-ping [animation-delay:600ms]" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Tudo pronto!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecionando para o dashboard...
          </p>
        </div>

        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full animate-[progressBar_2.5s_ease-in-out_forwards] rounded-full bg-primary" />
        </div>

        <style jsx>{`
          @keyframes progressBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  const checklistItems = [
    { label: 'Pelo menos 1 case registrado', ok: casesOk, count: counts?.cases ?? 0, min: 1 },
    { label: 'Pelo menos 3 dores registradas', ok: painsOk, count: counts?.pains ?? 0, min: 3 },
    { label: 'Pelo menos 1 padrao de solucao', ok: patternsOk, count: counts?.solutions ?? 0, min: 1 },
  ]

  return (
    <div data-testid="activation-step" className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Verifique se todos os requisitos foram atendidos para ativar o Inbound Forge.
      </p>

      {/* Checklist */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
              item.ok
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
            <span className={`text-xs font-mono ${item.ok ? 'text-green-600' : 'text-muted-foreground'}`}>
              {item.count}/{item.min}
            </span>
          </div>
        ))}
      </div>

      {!allMet && (
        <p className="text-center text-xs text-muted-foreground">
          Volte aos passos anteriores para completar os requisitos pendentes.
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button
          data-testid="activation-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          data-testid="activation-activate-btn"
          size="lg"
          onClick={handleActivate}
          disabled={!allMet || activating}
          isLoading={activating}
          loadingText="Ativando..."
        >
          Ativar Inbound Forge
        </Button>
      </div>
    </div>
  )
}
