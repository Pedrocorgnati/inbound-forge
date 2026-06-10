/**
 * Rastreabilidade: CL-298, TASK-2 ST004
 * Página de privacidade LGPD com export assíncrono e histórico de pedidos.
 */
import { PrivacyClient } from './PrivacyClient'

export const metadata = {
  title: 'Privacidade · Configurações',
}

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Privacidade e LGPD</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie direitos previstos na LGPD: portabilidade, acesso e exclusão.
        </p>
      </header>

      <section className="rounded-md border border-border p-4">
        <h2 className="text-lg font-medium">Portabilidade dos dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicite um arquivo JSON com todos os seus dados. Um link de download
          será enviado por email (válido por 24h). Limite: 1 export por dia.
        </p>
        <div className="mt-4">
          <PrivacyClient />
        </div>
      </section>
    </div>
  )
}
