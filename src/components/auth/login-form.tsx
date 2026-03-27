'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AccountLockBanner } from '@/components/shared/account-lock-banner'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  locale: string
}

export function LoginForm({ locale }: LoginFormProps) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [lockState, setLockState] = useState<{ locked: boolean; ttl: number } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setAuthError(null)

    const result = await signIn(data.email, data.password)

    if (result.locked && result.ttl) {
      setLockState({ locked: true, ttl: result.ttl })
      return
    }

    if (result.error) {
      setAuthError(result.error)
      return
    }

    // Success — redirect to dashboard
    router.push(`/${locale}/dashboard`)
    router.refresh()
  }

  const isLocked = lockState?.locked ?? false
  const isDisabled = isSubmitting || isLocked

  return (
    <form
      data-testid="form-login"
      aria-label="Formulário de login"
      aria-busy={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
    >
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite">
        {isSubmitting && 'Enviando formulário...'}
        {authError && authError}
      </div>

      {/* Lock banner */}
      {isLocked && lockState && (
        <AccountLockBanner
          ttlSeconds={lockState.ttl}
          onUnlock={() => setLockState(null)}
        />
      )}

      {/* Auth error */}
      {authError && !isLocked && (
        <div
          data-testid="form-login-error-alert"
          role="alert"
          className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {authError}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <input
          id="login-email"
          data-testid="form-login-email-input"
          type="email"
          autoComplete="email"
          autoFocus
          disabled={isDisabled}
          aria-invalid={!!errors.email || !!authError}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
          className={cn(
            'flex min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            'transition-colors duration-150',
            (errors.email || authError)
              ? 'border-danger bg-danger/5'
              : 'border-input hover:border-foreground/30'
          )}
          placeholder="seu@email.com"
        />
        {errors.email && (
          <p id="login-email-error" role="alert" className="text-xs text-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative">
          <input
            id="login-password"
            data-testid="form-login-password-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isDisabled}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
            className={cn(
              'flex min-h-[44px] w-full rounded-md border bg-background px-3 py-2 pr-12 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
              'transition-colors duration-150',
              errors.password
                ? 'border-danger bg-danger/5'
                : 'border-input hover:border-foreground/30'
            )}
            placeholder="••••••••"
          />
          <button
            data-testid="form-login-show-password-button"
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" role="alert" className="text-xs text-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        data-testid="form-login-submit-button"
        type="submit"
        className="w-full min-h-[44px]"
        disabled={isDisabled}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Entrando...
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  )
}
