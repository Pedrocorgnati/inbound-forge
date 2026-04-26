'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

const firstCaseSchema = z.object({
  name: z.string().min(3, 'Titulo deve ter no minimo 3 caracteres'),
  sector: z.string().min(2, 'Setor deve ter no minimo 2 caracteres'),
  outcome: z.string().min(50, 'Resultado deve ter no minimo 50 caracteres'),
})

type FirstCaseData = z.infer<typeof firstCaseSchema>

interface FirstCaseStepProps {
  onComplete: () => void
  onBack: () => void
}

interface SavedCase {
  name: string
  sector: string
}

export function FirstCaseStep({ onComplete, onBack }: FirstCaseStepProps) {
  const [savedCases, setSavedCases] = useState<SavedCase[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FirstCaseData>({
    resolver: zodResolver(firstCaseSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  async function onSubmit(data: FirstCaseData) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/knowledge/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          sector: data.sector,
          systemType: 'onboarding',
          outcome: data.outcome,
          hasQuantifiableResult: false,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Erro ao salvar case')
      }

      setSavedCases((prev) => [...prev, { name: data.name, sector: data.sector }])
      toast.success('Case salvo com sucesso')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar case')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="first-case-step" className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Registre pelo menos 1 case de sucesso. Isso alimenta o motor de conteudo com
        exemplos reais do seu trabalho.
      </p>

      {savedCases.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {savedCases.length} case{savedCases.length > 1 ? 's' : ''} registrado{savedCases.length > 1 ? 's' : ''}
          </p>
          {savedCases.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">({c.sector})</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="case-name">Titulo do case</Label>
          <Input
            id="case-name"
            placeholder="Ex: Automacao de vendas para restaurante"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <div>
          <Label htmlFor="case-sector">Setor</Label>
          <Input
            id="case-sector"
            placeholder="Ex: Alimentacao, Tecnologia, Saude"
            error={errors.sector?.message}
            {...register('sector')}
          />
        </div>

        <div>
          <Label htmlFor="case-outcome">Resultado obtido</Label>
          <textarea
            id="case-outcome"
            placeholder="Descreva o resultado alcancado (minimo 50 caracteres). Ex: Aumento de 40% nas vendas online em 3 meses com automacao de funil..."
            aria-invalid={!!errors.outcome}
            aria-describedby={errors.outcome ? 'case-outcome-error' : undefined}
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] hover:border-foreground/30"
            {...register('outcome')}
          />
          {errors.outcome?.message && (
            <p id="case-outcome-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.outcome.message}
            </p>
          )}
        </div>

        <Button
          data-testid="first-case-add-btn"
          type="submit"
          variant="secondary"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Adicionar case
        </Button>
      </form>

      <div className="flex justify-between pt-2">
        <Button
          data-testid="first-case-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          data-testid="first-case-next-btn"
          onClick={onComplete}
          disabled={savedCases.length < 1}
        >
          Proximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
