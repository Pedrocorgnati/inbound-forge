/**
 * TASK-6 ST004 + loop 05-27 TAREFA-026: /settings/account e o caminho UNICO do
 * perfil do operador — perfil (nome/email), troca de senha e troca de email.
 * Ver ADR-0010-profile-namespace. /profile redireciona (308) para ca.
 */
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'
import { ChangeEmailForm } from '@/components/settings/ChangeEmailForm'
import { MFAPanel } from './_components/MFAPanel'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Conta · Configurações',
}

interface SettingsAccountPageProps {
  params: Promise<{ locale: string }>
}

export default async function SettingsAccountPage({ params }: SettingsAccountPageProps) {
  const { locale } = await params
  const tProfile = await getTranslations('settings.profile')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/${locale}/login`)

  const initial = {
    name: (user.user_metadata?.name as string | undefined) ?? '',
    email: user.email ?? '',
  }

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Conta</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seu perfil, senha e email de acesso.
        </p>
      </header>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">{tProfile('title')}</h2>
        <p className="text-sm text-muted-foreground">{tProfile('description')}</p>
        <div className="mt-4 max-w-xl">
          <ProfileForm initial={initial} />
        </div>
      </section>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">Alterar senha</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">Alterar email</h2>
        <div className="mt-4">
          <ChangeEmailForm />
        </div>
      </section>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">Verificacao em duas etapas (MFA)</h2>
        <p className="text-sm text-muted-foreground">
          Adicione uma camada extra de seguranca exigindo um codigo TOTP no login.
        </p>
        <div className="mt-4 max-w-xl">
          <MFAPanel />
        </div>
      </section>
    </div>
  )
}
