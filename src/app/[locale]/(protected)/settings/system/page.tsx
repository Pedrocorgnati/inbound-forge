// TASK-8 ST003 (CL-292, CL-293): pagina de configuracoes sistemicas.
// Intake-Review TASK-5 ST002 (CL-225): bloco de threshold de custo USD adicionado.

import { getAllSystemSettings } from '@/lib/settings/system-settings'
import { getMonthlyTotalAll } from '@/lib/cost-tracking'
import { SystemSettingsForm } from '@/components/settings/SystemSettingsForm'
import { ThrottleConfigPanel } from '@/components/settings/ThrottleConfigPanel'
import { CostThresholdField } from '@/components/settings/CostThresholdField'

export const dynamic = 'force-dynamic'

export default async function SystemSettingsPage() {
  const [initial, currentSpendUsd] = await Promise.all([
    getAllSystemSettings(),
    getMonthlyTotalAll().catch(() => 0),
  ])

  return (
    <section className="space-y-8" data-testid="settings-system">
      <header>
        <h1 className="text-2xl font-semibold">Configurações do sistema</h1>
        <p className="text-sm text-muted-foreground">
          Limite de custo mensal e email de alertas — aplicados globalmente.
        </p>
      </header>
      <SystemSettingsForm initial={{ monthlyBudgetBRL: initial.monthlyBudgetBRL, alertsEmail: initial.alertsEmail }} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Threshold de custo (USD)</h2>
        <p className="text-sm text-muted-foreground">
          Dispara alerta quando o custo acumulado ultrapassa o valor configurado.
        </p>
        <CostThresholdField
          initialThresholdUsd={initial.monthlyCostThresholdUsd}
          initialCurrentSpendUsd={currentSpendUsd}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Throttling & Learn-to-Rank</h2>
        <p className="text-sm text-muted-foreground">
          Configure thresholds de ativacao e limites por janela da geracao de temas.
        </p>
        <ThrottleConfigPanel
          initial={{
            ltrMinPosts: initial.learnToRank.minPosts,
            ltrMinConversions: initial.learnToRank.minConversions,
            throttlePerHour: initial.themeThrottle.perHour,
            throttlePerDay: initial.themeThrottle.perDay,
          }}
        />
      </section>
    </section>
  )
}
