import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Login — Inbound Forge',
  robots: 'noindex, nofollow',
}

interface LoginPageProps {
  params: Promise<{ locale: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      redirect(`/${locale}/dashboard`)
    }
  } catch {
    // Not authenticated — render login page
  }

  return (
    <main data-testid="login-page" className="flex min-h-dvh items-center justify-center bg-background px-4 py-12"> {/* RESOLVED G07: min-h-screen→min-h-dvh */}
      <div className="w-full max-w-sm">
        {/* Logo + heading */}
        <div data-testid="login-logo" className="mb-8 text-center">
          {/* Logo — substituir SVG placeholder quando asset real for gerado */}
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
          <h1 className="text-2xl font-bold text-foreground">Inbound Forge</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso ao painel</p>
        </div>

        {/* Login card */}
        <div data-testid="login-card" className="rounded-lg bg-surface-raised p-8 shadow-card">
          <LoginForm locale={locale} />
          <div className="mt-4 text-center">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              data-testid="forgot-password-link"
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
