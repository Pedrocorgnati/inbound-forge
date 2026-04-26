'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from '@/components/ui/toast'
import { AlertCircle } from 'lucide-react'

const ConversionFormSchema = z.object({
  conversionType: z.enum(['CONVERSATION', 'MEETING', 'PROPOSAL'], {
    required_error: 'Selecione o tipo de conversao.',
  }),
  occurredAt: z.string().min(1, 'Data e obrigatoria.'),
  notes: z.string().max(500, 'Maximo de 500 caracteres.').optional(),
})

type ConversionFormData = z.infer<typeof ConversionFormSchema>

interface ConversionFormProps {
  leadId: string
  themeId: string
  onSuccess?: () => void
}

const CONVERSION_OPTIONS = [
  { value: 'CONVERSATION', label: 'Conversa' },
  { value: 'MEETING', label: 'Reuniao' },
  { value: 'PROPOSAL', label: 'Proposta' },
] as const

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function ConversionForm({ leadId, themeId, onSuccess }: ConversionFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConversionFormData>({
    resolver: zodResolver(ConversionFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      conversionType: undefined,
      occurredAt: getTodayString(),
      notes: '',
    },
  })

  const selectedType = watch('conversionType')
  const notesValue = watch('notes') ?? ''

  async function onSubmit(data: ConversionFormData) {
    const res = await fetch('/api/v1/conversions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        type: data.conversionType,
        occurredAt: new Date(data.occurredAt).toISOString(),
        notes: data.notes || undefined,
        attribution: 'FIRST_TOUCH',
      }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error ?? 'Erro ao registrar conversao')
      return
    }

    toast.success('Conversao registrada!')
    onSuccess?.()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-testid="conversion-form"
      className="space-y-4"
    >
      {/* Hidden fields */}
      <input type="hidden" value={leadId} name="leadId" />
      <input type="hidden" value={themeId} name="themeId" />

      {/* Tipo de conversao */}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-foreground">Tipo de conversao</legend>
        <RadioGroup
          value={selectedType}
          onValueChange={(val) =>
            setValue('conversionType', val as ConversionFormData['conversionType'], {
              shouldValidate: true,
            })
          }
          aria-describedby={errors.conversionType ? 'conversion-type-error' : undefined}
          data-testid="conversion-field-type"
        >
          {CONVERSION_OPTIONS.map((opt) => (
            <RadioGroupItem
              key={opt.value}
              value={opt.value}
              label={opt.label}
              data-testid={`conversion-type-${opt.value.toLowerCase()}`}
            />
          ))}
        </RadioGroup>
        {errors.conversionType && (
          <p id="conversion-type-error" role="alert" className="flex items-center gap-1 text-xs text-danger">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            {errors.conversionType.message}
          </p>
        )}
      </fieldset>

      {/* Data */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="conversion-occurred-at">Data</Label>
        <input
          type="date"
          id="conversion-occurred-at"
          aria-invalid={!!errors.occurredAt}
          aria-describedby={errors.occurredAt ? 'conversion-occurred-at-error' : undefined}
          className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors duration-[150ms] hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary"
          {...register('occurredAt')}
          data-testid="conversion-field-date"
        />
        {errors.occurredAt && (
          <p id="conversion-occurred-at-error" role="alert" className="flex items-center gap-1 text-xs text-danger">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            {errors.occurredAt.message}
          </p>
        )}
      </div>

      {/* Observacoes */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="conversion-notes">Observacoes</Label>
        <textarea
          id="conversion-notes"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground transition-colors duration-[150ms] hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary"
          placeholder="Detalhes sobre a conversao (opcional)"
          maxLength={500}
          {...register('notes')}
          data-testid="conversion-field-notes"
        />
        <p className="text-xs text-muted-foreground text-right">
          {notesValue.length}/500
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Registrando..."
          data-testid="conversion-submit"
        >
          Registrar Conversão
        </Button>
      </div>
    </form>
  )
}
