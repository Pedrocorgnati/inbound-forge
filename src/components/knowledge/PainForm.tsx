'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { AlertCircle } from 'lucide-react'
import type { PainResponse } from '@/lib/dtos/pain-library.dto'

interface PainFormProps {
  mode: 'create' | 'edit'
  initialData?: PainResponse
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  locale: string
}

interface FormData {
  title: string
  description: string
  sectors: string[]
}

const SECTOR_OPTIONS = [
  { value: 'operational_time', label: 'Tempo Operacional' },
  { value: 'spreadsheet_dependency', label: 'Dependência de Planilhas' },
  { value: 'systems_integration', label: 'Integração de Sistemas' },
  { value: 'manual_budgeting', label: 'Orçamento Manual' },
  { value: 'visibility_dashboards', label: 'Visibilidade / Dashboards' },
  { value: 'slow_customer_service', label: 'Atendimento Lento' },
  { value: 'scaling_difficulty', label: 'Dificuldade de Escalar' },
  { value: 'low_predictability', label: 'Baixa Previsibilidade' },
  { value: 'human_errors', label: 'Erros Humanos' },
  { value: 'ad_hoc_operation', label: 'Operação Ad-hoc' },
]

const MIN_DESC_CHARS = 10

export function PainForm({ mode, initialData, isOpen, onClose, onSuccess, locale }: PainFormProps) {
  const [form, setForm] = useState<FormData>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    sectors: initialData?.sectors ?? [],
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    if (form.title.trim().length < 3) {
      errs.title = 'Título deve ter no mínimo 3 caracteres'
    }
    if (form.description.trim().length < MIN_DESC_CHARS) {
      errs.description = `Descrição deve ter no mínimo ${MIN_DESC_CHARS} caracteres`
    }
    if (form.sectors.length === 0) {
      errs.sectors = 'Selecione ao menos uma categoria'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        sectors: form.sectors,
      }

      const url = mode === 'create'
        ? '/api/knowledge/pains'
        : `/api/knowledge/pains/${initialData!.id}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? `Erro ao ${mode === 'create' ? 'criar' : 'atualizar'} dor`)
      }

      toast.success(
        mode === 'create' ? 'Dor criada com sucesso' : 'Dor atualizada com sucesso'
      )
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSectorToggle(value: string) {
    const updated = form.sectors.includes(value)
      ? form.sectors.filter((s) => s !== value)
      : [...form.sectors, value]
    updateField('sectors', updated)
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Nova Dor' : 'Editar Dor'}
      description={
        mode === 'create'
          ? 'Cadastre uma nova dor identificada no processo de vendas.'
          : 'Atualize as informações da dor.'
      }
      size="lg"
    >
      <div data-testid="pain-form" className="space-y-4">
        <Input
          label="Título"
          placeholder="Ex: Perda de tempo com processos manuais"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          error={errors.title}
          data-testid="pain-field-title"
        />

        {/* Description textarea */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="pain-description">Descrição</Label>
          <textarea
            id="pain-description"
            className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] ${
              errors.description
                ? 'border-danger bg-danger/5 focus-visible:ring-danger'
                : 'border-input hover:border-foreground/30'
            }`}
            placeholder="Descreva a dor com detalhes..."
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            aria-invalid={errors.description ? 'true' : undefined}
            data-testid="pain-field-description"
          />
          {errors.description && (
            <p role="alert" className="flex items-center gap-1 text-xs text-danger">
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              {errors.description}
            </p>
          )}
        </div>

        {/* Category multi-select via checkboxes */}
        <div className="flex flex-col gap-1">
          <Label>Categorias</Label>
          <div className="grid grid-cols-2 gap-2">
            {SECTOR_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.sectors.includes(opt.value)}
                  onChange={() => handleSectorToggle(opt.value)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {errors.sectors && (
            <p role="alert" className="flex items-center gap-1 text-xs text-danger">
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              {errors.sectors}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Salvando..."
            data-testid="pain-submit"
          >
            {mode === 'create' ? 'Criar Dor' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
