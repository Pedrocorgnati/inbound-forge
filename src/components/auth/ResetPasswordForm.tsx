'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Senha deve ter ao menos 8 caracteres')
      .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Inclua ao menos um número'),
    confirm: z.string().min(1, 'Confirmação obrigatória'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  })

type ResetPasswordData = z.infer<typeof ResetPasswordSchema>

interface ResetPasswordFormProps {
  locale: string
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Supabase injeta sessão via URL hash — onAuthStateChange captura o evento
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true)
      }
    })

    // Verificar sessão existente (caso já tenha sido processada)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true)
      else setSessionError('Link de recuperação inválido ou expirado. Solicite um novo.')
    })

    return () => subscription.unsubscribe()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(ResetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordData) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      toast.error(error.message ?? 'Erro ao redefinir senha')
      return
    }

    toast.success('Senha redefinida com sucesso!')
    router.push(`/${locale}/login`)
  }

  if (sessionError) {
    return (
      <div data-testid="reset-password-error" className="text-center space-y-3">
        <p className="text-sm text-danger">{sessionError}</p>
        <a
          href={`/${locale}/forgot-password`}
          className="inline-block text-sm text-primary hover:underline"
        >
          Solicitar novo link
        </a>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="flex justify-center py-6" data-testid="reset-password-loading">
        <span className="text-sm text-muted-foreground">Verificando link...</span>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="reset-password-form"
    >
      <div className="space-y-1">
        <Label htmlFor="new-password">Nova senha</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('password')}
            aria-describedby={errors.password ? 'new-password-error' : undefined}
            data-testid="reset-password-new"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="new-password-error" className="text-xs text-danger">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirm-password">Confirmar senha</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('confirm')}
            aria-describedby={errors.confirm ? 'confirm-password-error' : undefined}
            data-testid="reset-password-confirm"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm && (
          <p id="confirm-password-error" className="text-xs text-danger">{errors.confirm.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-testid="reset-password-submit"
      >
        {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
      </Button>
    </form>
  )
}
