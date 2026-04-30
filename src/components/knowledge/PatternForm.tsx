'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ResponsiveSheet } from '@/components/ui/responsive-sheet'
import { toast } from '@/components/ui/toast'
import { AlertCircle } from 'lucide-react'
import { useKnowledgeAutosave } from '@/hooks/useKnowledgeAutosave'
import { useFormatters } from '@/lib/i18n/formatters'
import type { PatternResponse } from '@/lib/dtos/solution-pattern.dto'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'
import type { CaseResponse } from '@/lib/dtos/case-library.dto'

interface PatternFormProps {
  mode: 'create' | 'edit'
  initialData?: PatternResponse
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  locale: string
}

interface FormData {
  name: string
  description: string
  painId: string
  caseId: string
}

const MIN_DESC_CHARS = 10

export function PatternForm({ mode, initialData, isOpen, onClose, onSuccess, locale: _locale }: PatternFormProps) {
  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    painId: initialData?.painId ?? '',
    caseId: initialData?.caseId ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dropdown data
  const [pains, setPains] = useState<PainResponse[]>([])
  const [cases, setCases] = useState<CaseResponse[]>([])
  const [isLoadingPains, setIsLoadingPains] = useState(false)
  const [isLoadingCases, setIsLoadingCases] = useState(false)

  // Autosave (edit mode only)
  const { autosaveStatus, lastSaved } = useKnowledgeAutosave({
    form,
    endpoint: `/api/knowledge/patterns/${initialData?.id}`,
    getPayload: (data) => {
      const payload: Record<string, string> = {
        name: data.name.trim(),
        description: data.description.trim(),
        painId: data.painId,
      }
      if (data.caseId) payload.caseId = data.caseId
      return payload
    },
    entityId: initialData?.id,
    mode,
    isOpen,
  })

  // RESOLVED: G002 — useFormatters usa locale dinâmico
  const fmt = useFormatters()

  const fetchPains = useCallback(async () => {
    setIsLoadingPains(true)
    try {
      const res = await fetch('/api/knowledge/pains?limit=100')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setPains(json.data ?? [])
    } catch {
      toast.error('Erro ao carregar dores')
    } finally {
      setIsLoadingPains(false)
    }
  }, [])

  const fetchCases = useCallback(async () => {
    setIsLoadingCases(true)
    try {
      const res = await fetch('/api/knowledge/cases?limit=100')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setCases(json.data ?? [])
    } catch {
      toast.error('Erro ao carregar cases')
    } finally {
      setIsLoadingCases(false)
    }
  }, [])

  // Load pains and cases on modal open
  useEffect(() => {
    if (isOpen) {
      fetchPains()
      fetchCases()
      // Reset form when opening for create
      if (mode === 'create' && !initialData) {
        setForm({ name: '', description: '', painId: '', caseId: '' })
        setErrors({})
      }
    }
  }, [isOpen, fetchPains, fetchCases, mode, initialData])

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {}

    if (form.name.trim().length < 3) {
      errs.name = 'Nome deve ter no mínimo 3 caracteres'
    }
    if (form.description.trim().length < MIN_DESC_CHARS) {
      errs.description = `Descrição deve ter no mínimo ${MIN_DESC_CHARS} caracteres`
    }
    if (!form.painId) {
      errs.painId = 'Selecione uma dor'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        description: form.description.trim(),
        painId: form.painId,
      }
      if (form.caseId) {
        payload.caseId = form.caseId
      }

      const url = mode === 'create'
        ? '/api/knowledge/patterns'
        : `/api/knowledge/patterns/${initialData!.id}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message ?? `Erro ao ${mode === 'create' ? 'criar' : 'atualizar'} padrão`)
      }

      toast.success(
        mode === 'create' ? 'Padrão criado com sucesso' : 'Padrão atualizado com sucesso'
      )
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const painOptions = [
    { value: '', label: isLoadingPains ? 'Carregando...' : 'Selecione uma dor' },
    ...pains.map((p) => ({ value: p.id, label: p.title })),
  ]

  const caseOptions = [
    { value: '', label: isLoadingCases ? 'Carregando...' : 'Nenhum (opcional)' },
    ...cases.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <ResponsiveSheet
      open={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Novo Padrão' : 'Editar Padrão'}
      description={
        mode === 'create'
          ? 'Cadastre um novo padrão de solução vinculado a uma dor.'
          : 'Atualize as informações do padrão.'
      }
      size="lg"
    >
      <form
        data-testid="pattern-form"
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
        noValidate
      >
        {/* Autosave indicator (edit mode) */}
        {mode === 'edit' && (
          <div aria-live="polite" className="text-xs text-muted-foreground text-right" data-testid="pattern-autosave-status">
            {autosaveStatus === 'saving' && 'Salvando...'}
            {autosaveStatus === 'saved' && lastSaved && `Salvo às ${fmt.time(lastSaved)}`}
            {autosaveStatus === 'error' && (
              <span className="text-danger">Erro ao salvar automaticamente</span>
            )}
          </div>
        )}

        <Input
          label="Nome"
          placeholder="Ex: Automação de follow-up com CRM"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          data-testid="pattern-field-name"
        />

        {/* Description textarea */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="pattern-description">Descrição</Label>
          <textarea
            id="pattern-description"
            className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] ${
              errors.description
                ? 'border-danger bg-danger/5 focus-visible:ring-danger'
                : 'border-input hover:border-foreground/30'
            }`}
            placeholder="Descreva o padrão de solução com detalhes..."
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            aria-invalid={errors.description ? 'true' : undefined}
            aria-describedby={errors.description ? 'pattern-description-error' : undefined}
            data-testid="pattern-field-description"
          />
          {errors.description && (
            <p id="pattern-description-error" role="alert" className="flex items-center gap-1 text-xs text-danger">
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              {errors.description}
            </p>
          )}
        </div>

        {/* Pain select (required) */}
        <Select
          label="Dor associada"
          options={painOptions}
          value={form.painId}
          onChange={(e) => updateField('painId', e.target.value)}
          error={errors.painId}
          disabled={isLoadingPains}
          data-testid="pattern-field-painId"
        />

        {/* Case select (optional) */}
        <Select
          label="Case associado (opcional)"
          options={caseOptions}
          value={form.caseId}
          onChange={(e) => updateField('caseId', e.target.value)}
          disabled={isLoadingCases}
          data-testid="pattern-field-caseId"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText="Salvando..."
            disabled={!form.painId}
            data-testid="pattern-submit"
          >
            {mode === 'create' ? 'Criar Padrão' : 'Salvar'}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  )
}
