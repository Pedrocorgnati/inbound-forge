'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})
type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>

interface ForgotPasswordFormProps {
  locale: string
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(ForgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordData) {
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/${locale}/reset-password`

    // Envia email via Supabase Auth — não confirmamos se email existe (segurança)
    await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div data-testid="forgot-password-success" className="text-center space-y-3">
        <div className="text-4xl">📧</div>
        <p className="text-sm text-foreground font-medium">Verifique seu e-mail</p>
        <p className="text-sm text-muted-foreground">
          Se este e-mail estiver cadastrado, você receberá um link de recuperação em breve.
        </p>
        <Link
          href={`/${locale}/login`}
          className="inline-block text-sm text-primary hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      data-testid="forgot-password-form"
    >
      <div className="space-y-1">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          {...register('email')}
          aria-describedby={errors.email ? 'forgot-email-error' : undefined}
          data-testid="forgot-password-email"
        />
        {errors.email && (
          <p id="forgot-email-error" className="text-xs text-danger">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        data-testid="forgot-password-submit"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={`/${locale}/login`} className="hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  )
}
