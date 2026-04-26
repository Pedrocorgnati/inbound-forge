'use client'

/**
 * TASK-6 ST003 (CL-AU-017): form de troca de senha via react-hook-form + Zod.
 * Exibe indicador de forca em tempo real.
 */
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const Schema = z
  .object({
    currentPassword: z.string().min(1, 'Obrigatoria'),
    newPassword: z
      .string()
      .min(10, 'Minimo 10 caracteres')
      .regex(/[A-Za-z]/, 'Inclua letra')
      .regex(/[0-9]/, 'Inclua numero')
      .regex(/[^A-Za-z0-9]/, 'Inclua simbolo'),
    confirmNewPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'As senhas nao coincidem',
  })

type FormData = z.infer<typeof Schema>

function strengthScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s as 0 | 1 | 2 | 3 | 4
}

const STRENGTH_LABEL = ['Muito fraca', 'Fraca', 'Media', 'Boa', 'Forte']
const STRENGTH_COLOR = [
  'bg-destructive/40',
  'bg-orange-400/60',
  'bg-yellow-400/60',
  'bg-emerald-400/60',
  'bg-emerald-500',
]

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(Schema) })

  const newPassword = watch('newPassword') ?? ''
  const score = strengthScore(newPassword)

  async function onSubmit(data: FormData) {
    const res = await fetch('/api/v1/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    })
    if (res.status === 401) {
      toast.error('Senha atual invalida')
      return
    }
    if (res.status === 429) {
      toast.error('Muitas tentativas. Aguarde 15 minutos.')
      return
    }
    if (!res.ok) {
      toast.error(`Falha (${res.status})`)
      return
    }
    toast.success('Senha atualizada')
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Senha atual
        </label>
        <input
          id="currentPassword"
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
        <label htmlFor="newPassword" className="text-sm font-medium">
          Nova senha
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < score ? STRENGTH_COLOR[score] : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Forca: {STRENGTH_LABEL[score]}</p>
        {errors.newPassword && (
          <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="text-sm font-medium">
          Confirmar nova senha
        </label>
        <input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmNewPassword')}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        {errors.confirmNewPassword && (
          <p className="mt-1 text-xs text-destructive">{errors.confirmNewPassword.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isSubmitting ? 'Atualizando...' : 'Atualizar senha'}
      </button>
    </form>
  )
}
