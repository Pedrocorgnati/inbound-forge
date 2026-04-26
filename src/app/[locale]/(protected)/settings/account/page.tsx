/**
 * TASK-6 ST004: /settings/account — troca de senha e email.
 */
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'
import { ChangeEmailForm } from '@/components/settings/ChangeEmailForm'

export const metadata = {
  title: 'Conta · Configurações',
}

export default function SettingsAccountPage() {
  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Conta</h1>
        <p className="text-sm text-muted-foreground">
          Atualize sua senha e email de acesso.
        </p>
      </header>

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
    </div>
  )
}
