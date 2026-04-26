'use client'

// TASK-8 ST003 (CL-292, CL-293): form de SystemSetting (monthlyBudgetBRL +
// alertsEmail). RHF + Zod. Submit chama PUT /api/v1/settings/system.

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'

const Schema = z.object({
  monthlyBudgetBRL: z.coerce.number().min(0).max(1_000_000),
  alertsEmail: z.string().email('Email inválido'),
})

type FormValues = z.infer<typeof Schema>

interface SystemSettingsFormProps {
  initial: FormValues
}

export function SystemSettingsForm({ initial }: SystemSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: initial,
  })

  async function handleSendTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/v1/settings/alerts/test', { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.error ?? `Falha (status ${res.status})`)
      }
      const sentTo = payload?.data?.sentTo
      toast.success(sentTo ? `Email de teste enviado para ${sentTo}` : 'Email de teste enviado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar teste')
    } finally {
      setTesting(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Falha (status ${res.status})`)
      }
      toast.success('Configurações atualizadas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-lg space-y-5"
      data-testid="system-settings-form"
    >
      <div className="space-y-1">
        <label htmlFor="monthlyBudgetBRL" className="block text-sm font-medium">
          Limite mensal de custo (R$)
        </label>
        <input
          id="monthlyBudgetBRL"
          type="number"
          step="0.01"
          min="0"
          {...register('monthlyBudgetBRL')}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
        <p className="text-xs text-muted-foreground">
          Quando o consumo atinge este valor, workers pausam automaticamente.
        </p>
        {errors.monthlyBudgetBRL && (
          <p className="text-xs text-destructive">{errors.monthlyBudgetBRL.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="alertsEmail" className="block text-sm font-medium">
          Email para alertas
        </label>
        <input
          id="alertsEmail"
          type="email"
          {...register('alertsEmail')}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        />
        <p className="text-xs text-muted-foreground">
          Destinatário de avisos de budget, worker silencioso e rate-limit.
        </p>
        {errors.alertsEmail && (
          <p className="text-xs text-destructive">{errors.alertsEmail.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={handleSendTest}
          disabled={testing || isDirty}
          title={isDirty ? 'Salve as alteracoes antes de enviar o teste' : 'Envia um email de teste para o destinatario configurado'}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-60"
          data-testid="system-settings-send-test"
        >
          {testing ? 'Enviando...' : 'Enviar teste'}
        </button>
      </div>
    </form>
  )
}
