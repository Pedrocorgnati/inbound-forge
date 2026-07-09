'use client'

/**
 * TASK-6 ST004 (CL-AU-018): form de troca de email. Supabase envia email de
 * confirmacao para o novo endereco antes de efetivar.
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

const Schema = z.object({
  currentPassword: z.string().min(1, 'Obrigatoria'),
  newEmail: z.string().email('Email invalido'),
})

type FormData = z.infer<typeof Schema>

export function ChangeEmailForm() {
  const tToast = useTranslations('toasts')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(Schema) })

  async function onSubmit(data: FormData) {
    const res = await fetch('/api/v1/me/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.status === 401) {
      toast.error(tToast('auth.current_password_invalid'))
      return
    }
    if (res.status === 429) {
      toast.error(tToast('auth.too_many_attempts'))
      return
    }
    if (!res.ok) {
      toast.error(`Falha (${res.status})`)
      return
    }
    toast.success(tToast('auth.email_confirmation_sent'))
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="change-email-password" className="text-sm font-medium">
          Senha atual
        </label>
        <input
          id="change-email-password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {errors.currentPassword && (
          <p className="mt-1 text-xs text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="change-email-new" className="text-sm font-medium">
          Novo email
        </label>
        <input
          id="change-email-new"
          type="email"
          autoComplete="email"
          {...register('newEmail')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Um email de confirmacao sera enviado ao novo endereco.
        </p>
        {errors.newEmail && (
          <p className="mt-1 text-xs text-destructive">{errors.newEmail.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando...' : 'Solicitar troca de email'}
      </button>
    </form>
  )
}
