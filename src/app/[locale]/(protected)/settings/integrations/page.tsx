/**
 * /settings/integrations — Integracoes OAuth
 * TASK-6 ST003 / CL-072 (pos-MVP)
 *
 * Pagina onde o operador conecta contas de redes sociais via OAuth.
 * Atualmente: TikTok. Future: YouTube, etc.
 */
import type { Metadata } from 'next'
import { TikTokConnectCard } from '@/components/settings/TikTokConnectCard'

export const metadata: Metadata = {
  title: 'Integracoes | Inbound Forge',
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6" data-testid="integrations-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Integracoes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte suas contas de redes sociais para publicacao automatizada.
        </p>
      </div>
      <TikTokConnectCard />
    </div>
  )
}
