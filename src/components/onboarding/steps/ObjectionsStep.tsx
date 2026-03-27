'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, Loader2, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

const OBJECTION_TYPES = [
  { value: 'PRICE', label: 'Preco' },
  { value: 'TRUST', label: 'Confianca' },
  { value: 'TIMING', label: 'Timing' },
  { value: 'NEED', label: 'Necessidade' },
  { value: 'AUTHORITY', label: 'Autoridade' },
] as const

type ObjectionType = typeof OBJECTION_TYPES[number]['value']

interface SavedObjection {
  content: string
  type: ObjectionType
}

interface ObjectionsStepProps {
  onComplete: () => void
  onSkip: () => void
  onBack: () => void
}

export function ObjectionsStep({ onComplete, onSkip, onBack }: ObjectionsStepProps) {
  const [savedObjections, setSavedObjections] = useState<SavedObjection[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [type, setType] = useState<ObjectionType>('PRICE')

  async function handleAdd() {
    if (content.length < 5) {
      toast.error('A objecao deve ter no minimo 5 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/knowledge/objections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error((body as { error?: string } | null)?.error ?? 'Erro ao salvar objecao')
      }

      setSavedObjections((prev) => [...prev, { content, type }])
      toast.success('Objecao registrada')
      setContent('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar objecao')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div data-testid="objections-step" className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Registre objecoes comuns que seus clientes levantam. Este passo e opcional, mas
          ajuda a gerar conteudo que antecipa e responde duvidas.
        </p>
      </div>

      {/* Saved objections */}
      {savedObjections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {savedObjections.length} objecao{savedObjections.length > 1 ? 'oes' : ''} registrada{savedObjections.length > 1 ? 's' : ''}
          </p>
          {savedObjections.map((o, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm"
            >
              <span>{o.content}</span>
              <span className="shrink-0 ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {OBJECTION_TYPES.find((t) => t.value === o.type)?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="objection-content">Objecao</Label>
          <textarea
            id="objection-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder='Ex: "E muito caro para o porte da minha empresa"'
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] hover:border-foreground/30"
          />
        </div>

        <div>
          <Label htmlFor="objection-type">Tipo</Label>
          <select
            id="objection-type"
            value={type}
            onChange={(e) => setType(e.target.value as ObjectionType)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition-colors duration-[150ms] hover:border-foreground/30"
          >
            {OBJECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          data-testid="objections-add-btn"
          variant="secondary"
          onClick={handleAdd}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Adicionar objecao
        </Button>
      </div>

      <div className="flex justify-between pt-2">
        <Button
          data-testid="objections-back-btn"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex gap-2">
          <Button
            data-testid="objections-skip-btn"
            variant="outline"
            onClick={onSkip}
          >
            <SkipForward className="mr-1 h-4 w-4" />
            Pular este passo
          </Button>
          {savedObjections.length > 0 && (
            <Button
              data-testid="objections-next-btn"
              onClick={onComplete}
            >
              Proximo
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
