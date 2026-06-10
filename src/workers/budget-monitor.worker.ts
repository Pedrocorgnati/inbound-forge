/**
 * Rastreabilidade: CL-307, TASK-4 ST003
 * Worker de budget monitor — invocado pelo cron /api/cron/budget-check a cada 6h.
 */
import { checkBurnRate } from '@/lib/cost/burn-rate-monitor'

export async function run(): Promise<void> {
  const result = await checkBurnRate()
  console.info(
    `[budget-monitor] burn=${result.burnPct.toFixed(1)}% ($${result.totalUsd.toFixed(2)}/$${result.budgetUsd}) alertFired=${result.alertFired ?? 'none'}`,
  )
}
