'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import type { ObjectionResponse } from '@/lib/dtos/objection.dto'

interface ObjectionFormProps {
  mode: 'create' | 'edit'
  initialData?: ObjectionResponse
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  locale: string
}

interface FormData {
  content: string
  type: 'PRICE' | 'TRUST' | 'TIMING' | 'NEED' | 'AUTHORITY'
}

const TYPE_OPTIONS: { value: FormData['type']; label: string; variant: 'warning' | 'danger' | 'info' | 'primary' | 'default' }[] = [
  { value: 'PRICE', label: 'Preço', variant: 'warning' },
  { value: 'TRUST', label: 'Confiança', variant: 'danger' },
  { value: 'TIMING', label: 'Timing', variant: 'info' },
  { value: 'NEED', label: 'Necessidade', variant: 'primary' },
  { value: 'AUTHORITY', label: 'Autoridade', variant: 'default' },
]

const MIN_CONTENT_CHARS = 5

export function ObjectionForm({
  mode,
  initialData,
  isOpen,
  onClose,
  onSuccess,
  locale,
}: ObjectionFormProps) {
  const [form, setForm] = useState<FormData>({
    content: initialData?.content ?? '',
    type: initialData?.type ?? 'PRICE',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedType = TYPE_OPTIONS.find((t) => t.value === form.type)

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

    if (form.content.trim().length < MIN_CONTENT_CHARS) {
      errs.content = `Objeção deve ter no mínimo ${MIN_CONTENT_CHARS} caracteres`
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function resetForm() {
    setForm({
      content: initialData?.content ?? '',
      type: initialData?.type ?? 'PRICE',
    })
    setErrors({})
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit() {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload = {
        content: form.content.trim(),
        type: form.type,
      }

      const url =
        mode === 'create'
          ? '/api/knowledge/objections'
          : `/api/knowledge/objections/${initialData!.id}`

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao salvar objeção')
      }

      toast.success(
        mode === 'create'
          ? 'Objeção criada com sucesso'
          : 'Objeção atualizada com sucesso'
      )

      resetForm()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'Nova Objeção' : 'Editar Objeção'}
      description={
        mode === 'create'
          ? 'Adicione uma objeção comum dos seus prospects.'
          : 'Atualize os dados da objeção.'
      }
      onConfirm={handleSubmit}
      confirmLabel={mode === 'create' ? 'Criar' : 'Salvar'}
      cancelLabel="Cancelar"
      size="md"
    >
      <div className="space-y-4">
        {/* Content textarea */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="objection-content">Objeção</Label>
          <textarea
            id="objection-content"
            className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[150ms] ${
              errors.content
                ? 'border-danger bg-danger/5 focus-visible:ring-danger'
                : 'border-input hover:border-foreground/30'
            }`}
            placeholder='Ex: "Inbound marketing demora muito para dar resultado"'
            value={form.content}
            onChange={(e) => updateField('content', e.target.value)}
            aria-invalid={errors.content ? 'true' : undefined}
            aria-describedby="content-error"
            data-testid="objection-field-content"
          />
          {errors.content && (
            <p
              id="content-error"
              role="alert"
              className="flex items-center gap-1 text-xs text-danger"
            >
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
              {errors.content}
            </p>
          )}
        </div>

        {/* Type selection */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Tipo de objeção
          </legend>

          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  form.type === option.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-input hover:border-foreground/30'
                }`}
                data-testid={`objection-type-${option.value.toLowerCase()}`}
              >
                <input
                  type="radio"
                  name="objection-type"
                  value={option.value}
                  checked={form.type === option.value}
                  onChange={() => updateField('type', option.value)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {/* Badge preview */}
          {selectedType && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Preview:</span>
              <Badge variant={selectedType.variant}>{selectedType.label}</Badge>
            </div>
          )}
        </fieldset>
      </div>
    </Modal>
  )
}
