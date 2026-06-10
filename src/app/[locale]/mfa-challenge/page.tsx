/**
 * loop 05-27 TAREFA-028 (P3): pagina de desafio MFA no login.
 *
 * Para onde o middleware redireciona usuarios autenticados em AAL1 que possuem um
 * fator TOTP verificado (AAL2 exigido). Cumpre "login pos-enable exige TOTP". Se a
 * sessao ja satisfaz o nivel exigido (ou nao ha fator), redireciona de volta ao
 * destino — nunca prende o usuario aqui.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { validateCallbackUrl } from '@/lib/auth/callback-validation'
import { MFAChallengeForm } from './MFAChallengeForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Verificacao em duas etapas',
}

interface MFAChallengePageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}

export default async function MFAChallengePage({ params, searchParams }: MFAChallengePageProps) {
  const { locale } = await params
  const { redirect: redirectParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { sanitized } = validateCallbackUrl(redirectParam ?? `/${locale}`)
  const destination = sanitized.startsWith('/') ? sanitized : `/${locale}`

  // Se a sessao ja esta em AAL2 (ou nao ha fator exigindo elevacao), nao prende aqui.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (!aal || aal.nextLevel !== 'aal2' || aal.currentLevel === aal.nextLevel) {
    redirect(destination)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-6">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Verificacao em duas etapas</h1>
          <p className="text-sm text-muted-foreground">
            Digite o codigo do seu app autenticador para concluir o login.
          </p>
        </header>
        <MFAChallengeForm redirectTo={destination} />
      </div>
    </main>
  )
}
