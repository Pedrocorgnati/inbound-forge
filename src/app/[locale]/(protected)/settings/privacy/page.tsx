/**
 * TASK-5 ST003 (CL-AU-016): page de privacidade LGPD.
 * Hospeda botao de portabilidade (ExportMyDataButton).
 */
import { ExportMyDataButton } from '@/components/settings/ExportMyDataButton'

export const metadata = {
  title: 'Privacidade · Configurações',
}

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Privacidade e LGPD</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie direitos previstos na LGPD: portabilidade, acesso e exclusao.
        </p>
      </header>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">Portabilidade dos dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixa um arquivo JSON consolidado com seus dados. PII sensivel de leads
          (email/telefone) e exibida mascarada.
        </p>
        <div className="mt-4">
          <ExportMyDataButton />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Limite: 1 export por hora por usuario. Cada download gera registro em
          audit log.
        </p>
      </section>
    </div>
  )
}
