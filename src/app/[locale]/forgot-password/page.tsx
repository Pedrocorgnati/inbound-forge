import type { Metadata } from 'next'
import Image from 'next/image'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar senha — Inbound Forge',
  robots: 'noindex, nofollow',
}

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params

  return (
    <main
      data-testid="forgot-password-page"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center">
            <Image
              src="/images/logo-symbol.svg"
              alt="Inbound Forge"
              width={48}
              height={48}
              priority
              className="rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail para receber um link de recuperação
          </p>
        </div>

        <div className="rounded-lg bg-surface-raised p-8 shadow-card">
          <ForgotPasswordForm locale={locale} />
        </div>
      </div>
    </main>
  )
}
