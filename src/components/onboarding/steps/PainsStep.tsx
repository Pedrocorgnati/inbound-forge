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

const painSchema = z.object({
  title: z.string().min(3, 'Titulo deve ter no minimo 3 caracteres'),
  description: z.string().min(20, 'Descricao deve ter no minimo 20 caracteres'),
  sector: z.string().min(2, 'Setor deve ter no minimo 2 caracteres'),
})

type PainData = z.infer<typeof painSchema>

interface PainsStepProps {
  onComplete: () => void
  onBack: () => void
}

interface SavedPain {
  title: string
}

export function PainsStep({ onComplete, onBack }: PainsStepProps) {
  const [savedPains, setSavedPains] = useState<SavedPain[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PainData>({
    resolver: zodResolver(painSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const MIN_PAINS = 3

  async function onSubmit(data: PainData) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/knowledge/pains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          sectors: [data.sector],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Erro ao salvar dor')
      }

      setSavedPains((prev) => [...prev, { title: data.title }])
      toast.success('Dor registrada com sucesso')
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar dor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="pains-step" className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Registre as dores mais comuns dos seus clientes. Isso ajuda o motor a gerar conteudo
          que ressoa com a audiencia.
        </p>
        <p className="mt-2 text-xs text-primary font-medium">
          Quanto mais dores, melhor o tema engine funciona.
        </p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2">
        <span className="text-sm font-medium text-foreground">
          {savedPains.length}/{MIN_PAINS} dores registradas
        </span>
        <div className="flex gap-1">
          {Array.from({ length: MIN_PAINS }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-6 rounded-full transition-colors ${
                i < savedPains.length ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Saved pains list */}
      {savedPains.length > 0 && (
        <div className="space-y-2">
          {savedPains.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm"
            >
              <span className="font-medium">{p.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="pain-title">Titulo da dor</Label>
          <Input
            id="pain-title"
            placeholder="Ex: Dificuldade em gerar leads qualificados"
            error={errors.title?.message}
            {...register('title')}
          />
        </div>

        <div>
          <Label htmlFor="pain-description">Descricao</Label>
          <textarea
            id="pain-description"
            placeholder="Descreva a dor em detalhes (minimo 20 caracteres)"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'pain-description-error' : undefined}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] hover:border-foreground/30"
            {...register('description')}
          />
          {errors.description?.message && (
            <p id="pain-description-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="pain-sector">Setor relacionado</Label>
          <Input
            id="pain-sector"
            placeholder="Ex: Tecnologia, Saude, Varejo"
            error={errors.sector?.message}
            {...register('sector')}
          />
        </div>

        <Button
          data-testid="pains-add-btn"
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
          Adicionar dor
        </Button>
      </form>

      <div className="flex justify-between pt-2">
        <Button
          data-testid="pains-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <Button
          data-testid="pains-next-btn"
          onClick={onComplete}
          disabled={savedPains.length < MIN_PAINS}
        >
          Proximo
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
