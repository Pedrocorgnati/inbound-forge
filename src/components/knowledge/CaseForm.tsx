'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, FileWarning, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useAutosave } from '@/hooks/useAutosave'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface CaseFormProps {
  mode: 'create' | 'edit'
  initialData?: CaseResponse
  locale: string
}

interface FormData {
  name: string
  sector: string
  systemType: string
  outcome: string
  hasQuantifiableResult: boolean
}

const MIN_OUTCOME_CHARS = 50

export function CaseForm({ mode, initialData, locale }: CaseFormProps) {
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? '',
    sector: initialData?.sector ?? '',
    systemType: initialData?.systemType ?? '',
    outcome: initialData?.outcome ?? '',
    hasQuantifiableResult: initialData?.hasQuantifiableResult ?? false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDraft = initialData?.isDraft ?? true
  const canPublish = form.outcome.length >= MIN_OUTCOME_CHARS
  const outcomeCharCount = form.outcome.length

  // Stable serialized form for autosave dependency
  const formSerialized = useMemo(() => JSON.stringify(form), [form])

  const saveFn = useCallback(
    async (data: FormData) => {
      if (!initialData?.id) return
      const res = await fetch(`/api/knowledge/cases/${initialData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
    },
    [initialData?.id]
  )

  const { status: autosaveStatus, lastSaved, triggerSave } = useAutosave(
    formSerialized,
    async () => saveFn(form),
    2000,
    mode === 'edit' && !!initialData?.id
  )

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validate(publishing: boolean): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}

    if (form.name.trim().length < 3) {
      errs.name = 'Nome deve ter no mínimo 3 caracteres'
    }
    if (form.sector.trim().length < 2) {
      errs.sector = 'Setor é obrigatório'
    }
    if (form.systemType.trim().length < 2) {
      errs.systemType = 'Tipo de sistema é obrigatório'
    }
    if (publishing && form.outcome.length < MIN_OUTCOME_CHARS) {
      errs.outcome = `Resultado deve ter no mínimo ${MIN_OUTCOME_CHARS} caracteres para publicar`
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(asDraft: boolean) {
    const publishing = !asDraft
    if (!validate(publishing)) return

    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        const _body = {
          ...form,
          isDraft: asDraft,
          // For draft creation, outcome validation is relaxed
          outcome: form.outcome || ' '.repeat(50), // API needs min 50 for schema
        }

        // If saving as draft and outcome < 50, pad minimally for schema but keep real outcome
        const payload = {
          name: form.name.trim(),
          sector: form.sector.trim(),
          systemType: form.systemType.trim(),
          outcome: asDraft && form.outcome.length < MIN_OUTCOME_CHARS
            ? form.outcome.padEnd(MIN_OUTCOME_CHARS, ' ')
            : form.outcome,
          hasQuantifiableResult: form.hasQuantifiableResult,
          isDraft: asDraft,
        }

        const res = await fetch('/api/knowledge/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Erro ao criar case')
        }

        toast.success(asDraft ? 'Rascunho salvo com sucesso' : 'Case publicado com sucesso')
        router.push(`/${locale}/knowledge?tab=cases`)
      } else {
        // Edit mode — explicit save (publish or save draft)
        const payload = {
          ...form,
          name: form.name.trim(),
          sector: form.sector.trim(),
          systemType: form.systemType.trim(),
          isDraft: asDraft,
        }

        const res = await fetch(`/api/knowledge/cases/${initialData!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error ?? 'Erro ao atualizar case')
        }

        toast.success(asDraft ? 'Rascunho salvo' : 'Case publicado com sucesso')
        router.push(`/${locale}/knowledge?tab=cases`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div data-testid="case-form" className="mx-auto max-w-2xl space-y-6">
      {/* Draft banner */}
      {isDraft && mode === 'edit' && (
        <div
          className="flex items-center gap-2 rounded-md border border-warning/20 bg-warning/10 px-4 py-3"
          data-testid="case-draft-banner"
          role="status"
        >
          <FileWarning className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-sm text-warning-foreground">
            Rascunho — não visível em análises
          </p>
        </div>
      )}

      {/* Autosave indicator */}
      {mode === 'edit' && (
        <div aria-live="polite" className="text-xs text-muted-foreground text-right" data-testid="autosave-status">
          {autosaveStatus === 'saving' && 'Salvando...'}
          {autosaveStatus === 'saved' && lastSaved && `Salvo às ${formatTime(lastSaved)}`}
          {autosaveStatus === 'error' && (
            <span className="text-danger">Erro ao salvar automaticamente</span>
          )}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        <Input
          label="Nome do case"
          placeholder="Ex: Agência X triplicou leads com automação"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          data-testid="case-field-name"
        />

        <Input
          label="Setor"
          placeholder="Ex: Tecnologia, Saúde, Educação"
          value={form.sector}
          onChange={(e) => updateField('sector', e.target.value)}
          error={errors.sector}
          data-testid="case-field-sector"
        />

        <Input
          label="Tipo de sistema"
          placeholder="Ex: CRM, E-commerce, SaaS"
          value={form.systemType}
          onChange={(e) => updateField('systemType', e.target.value)}
          error={errors.systemType}
          data-testid="case-field-systemType"
        />

        {/* Outcome textarea */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="case-outcome">Resultado obtido</Label>
          <textarea
            id="case-outcome"
            className={`flex min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] ${
              errors.outcome
                ? 'border-danger bg-danger/5 focus-visible:ring-danger'
                : 'border-input hover:border-foreground/30'
            }`}
            placeholder="Descreva o resultado obtido pelo cliente com detalhes suficientes..."
            value={form.outcome}
            onChange={(e) => updateField('outcome', e.target.value)}
            aria-invalid={errors.outcome ? 'true' : undefined}
            aria-describedby="outcome-counter outcome-error"
            data-testid="case-field-outcome"
          />
          <div className="flex items-center justify-between">
            <div>
              {errors.outcome && (
                <p
                  id="outcome-error"
                  role="alert"
                  className="flex items-center gap-1 text-xs text-danger"
                >
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
                  {errors.outcome}
                </p>
              )}
            </div>
            <p
              id="outcome-counter"
              className={`text-xs ${
                outcomeCharCount < MIN_OUTCOME_CHARS
                  ? 'text-muted-foreground'
                  : 'text-success'
              }`}
            >
              {outcomeCharCount}/{MIN_OUTCOME_CHARS} caracteres mínimos
            </p>
          </div>
        </div>

        {/* Quantifiable result checkbox */}
        <label
          className="flex items-center gap-2 cursor-pointer"
          data-testid="case-field-hasQuantifiableResult"
        >
          <input
            type="checkbox"
            checked={form.hasQuantifiableResult}
            onChange={(e) => updateField('hasQuantifiableResult', e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-foreground">Resultado quantificável</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/knowledge?tab=cases`)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          isLoading={isSubmitting}
          loadingText="Salvando..."
          data-testid="case-save-draft"
        >
          <Save className="h-4 w-4" aria-hidden />
          Salvar Rascunho
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={!canPublish || isSubmitting}
          isLoading={isSubmitting}
          loadingText="Publicando..."
          data-testid="case-publish"
        >
          Publicar
        </Button>
      </div>

      {/* Manual save shortcut in edit mode */}
      {mode === 'edit' && (
        <p className="text-xs text-muted-foreground text-center">
          Alterações são salvas automaticamente. Você também pode{' '}
          <button
            type="button"
            onClick={triggerSave}
            className="underline hover:text-foreground transition-colors"
          >
            salvar agora
          </button>
          .
        </p>
      )}
    </div>
  )
}
