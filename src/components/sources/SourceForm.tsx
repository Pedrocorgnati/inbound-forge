'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { SourceDto } from '@/lib/services/source.service'

const SourceFormSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(255),
  url: z.string().url('URL inválida').max(1024),
  crawlFrequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
})

type SourceFormValues = z.infer<typeof SourceFormSchema>

const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'A cada hora' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
]

interface SourceFormProps {
  source?: SourceDto
  onClose: () => void
  onSuccess: () => void
}

export function SourceForm({ source, onClose, onSuccess }: SourceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!source

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(SourceFormSchema),
    defaultValues: {
      name: source?.name ?? '',
      url: source?.url ?? '',
      crawlFrequency: (source?.crawlFrequency as SourceFormValues['crawlFrequency']) ?? 'daily',
    },
  })

  async function onSubmit(values: SourceFormValues) {
    setIsSubmitting(true)
    try {
      const url = isEdit ? `/api/sources/${source!.id}` : '/api/sources'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? 'Erro ao salvar fonte')
      }

      toast.success(isEdit ? 'Fonte atualizada com sucesso' : 'Fonte criada com sucesso')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar fonte')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Editar fonte' : 'Nova fonte de scraping'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="source-form">
        <div className="space-y-1">
          <label htmlFor="source-name" className="text-sm font-medium text-foreground">
            Nome <span aria-hidden className="text-danger">*</span>
          </label>
          <Input
            id="source-name"
            {...register('name')}
            placeholder="Ex: Blog de Marketing B2B"
            data-testid="source-form-name"
            aria-describedby={errors.name ? 'source-name-error' : undefined}
          />
          {errors.name && (
            <p id="source-name-error" className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="source-url" className="text-sm font-medium text-foreground">
            URL <span aria-hidden className="text-danger">*</span>
          </label>
          <Input
            id="source-url"
            type="url"
            {...register('url')}
            placeholder="https://exemplo.com/blog"
            data-testid="source-form-url"
            aria-describedby={errors.url ? 'source-url-error' : undefined}
          />
          {errors.url && (
            <p id="source-url-error" className="text-xs text-danger">{errors.url.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="source-frequency" className="text-sm font-medium text-foreground">
            Frequência de coleta
          </label>
          <Select
            id="source-frequency"
            {...register('crawlFrequency')}
            options={FREQUENCY_OPTIONS}
            data-testid="source-form-frequency"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="source-form-submit">
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar fonte'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
