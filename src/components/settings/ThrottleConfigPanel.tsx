'use client'

// ThrottleConfigPanel — learn-to-rank + theme throttle (TASK-11 ST004 / CL-082,CL-054)

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

const Schema = z.object({
  ltrMinPosts: z.coerce.number().int().min(10).max(10_000),
  ltrMinConversions: z.coerce.number().int().min(1).max(10_000),
  throttlePerHour: z.coerce.number().int().min(1).max(100),
  throttlePerDay: z.coerce.number().int().min(1).max(1_000),
})
type FormValues = z.infer<typeof Schema>

interface Props {
  initial: FormValues
}

export function ThrottleConfigPanel({ initial }: Props) {
  const [saving, setSaving] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues: initial })

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const res = await apiClient('/api/v1/settings/system', {
        method: 'PUT',
        body: JSON.stringify({
          learnToRank: { minPosts: values.ltrMinPosts, minConversions: values.ltrMinConversions },
          themeThrottle: { perHour: values.throttlePerHour, perDay: values.throttlePerDay },
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `Falha (status ${res.status})`)
      }
      toast.success('Throttling atualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const throttlePerHour = watch('throttlePerHour')

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-lg space-y-6"
      data-testid="throttle-config-panel"
    >
      <section className="space-y-3 rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold">Learn-to-Rank</h3>
        <p className="text-xs text-muted-foreground">
          Threshold para ativacao automatica (posts publicados + conversoes).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Mín. posts (&gt;= 10)</span>
            <input
              type="number"
              {...register('ltrMinPosts')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.ltrMinPosts && (
              <span className="text-xs text-destructive">{errors.ltrMinPosts.message}</span>
            )}
          </label>
          <label className="space-y-1 text-sm">
            <span>Mín. conversões (&gt;= 1)</span>
            <input
              type="number"
              {...register('ltrMinConversions')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.ltrMinConversions && (
              <span className="text-xs text-destructive">{errors.ltrMinConversions.message}</span>
            )}
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold">Theme Generation Throttle</h3>
        <p className="text-xs text-muted-foreground">
          Limita quantas vezes a geracao de temas pode rodar por janela. Excedente dispara AlertLog WARN.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Por hora (1..100)</span>
            <input
              type="number"
              {...register('throttlePerHour')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              ~{Math.round((throttlePerHour || 0) * 24)}/dia estimado
            </span>
            {errors.throttlePerHour && (
              <span className="text-xs text-destructive">{errors.throttlePerHour.message}</span>
            )}
          </label>
          <label className="space-y-1 text-sm">
            <span>Por dia (1..1000)</span>
            <input
              type="number"
              {...register('throttlePerDay')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.throttlePerDay && (
              <span className="text-xs text-destructive">{errors.throttlePerDay.message}</span>
            )}
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving || !isDirty}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salvar throttling'}
      </button>
    </form>
  )
}
