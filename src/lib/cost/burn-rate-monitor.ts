/**
 * Rastreabilidade: CL-307, TASK-4 ST003
 * Monitor de burn rate mensal: dispara AlertLog em 80% e 100% do orçamento.
 */
import { prisma } from '@/lib/prisma'
import { getMonthlyTotalAll, MONTHLY_COST_TARGET_USD } from '@/lib/cost-tracking'
import { dispatchAlert } from '@/lib/alerts/dispatcher'
import { redis } from '@/lib/redis'

const ALERT_80_KEY = 'burn-rate:alerted:80'
const ALERT_100_KEY = 'burn-rate:alerted:100'
const ALERT_TTL_SECONDS = 24 * 3600

export interface BurnRateResult {
  totalUsd: number
  budgetUsd: number
  burnPct: number
  alertFired?: '80pct' | '100pct'
}

export async function checkBurnRate(): Promise<BurnRateResult> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const totalUsd = await getMonthlyTotalAll(startOfMonth)
  const budgetUsd = MONTHLY_COST_TARGET_USD
  const burnPct = (totalUsd / budgetUsd) * 100

  let alertFired: '80pct' | '100pct' | undefined

  if (burnPct >= 100) {
    const alerted = await redis.get<string>(ALERT_100_KEY)
    if (!alerted) {
      const created = await prisma.alertLog.create({
        data: {
          type: 'budget.burn_rate.100pct',
          severity: 'critical',
          message: `Budget mensal atingiu 100%: $${totalUsd.toFixed(2)} / $${budgetUsd} USD.`,
          resolved: false,
        },
      })
      await dispatchAlert({
        id: created.id,
        type: created.type,
        severity: created.severity,
        message: created.message,
      })
      await redis.set(ALERT_100_KEY, '1', { ex: ALERT_TTL_SECONDS })
      alertFired = '100pct'
    }
  } else if (burnPct >= 80) {
    const alerted = await redis.get<string>(ALERT_80_KEY)
    if (!alerted) {
      const created = await prisma.alertLog.create({
        data: {
          type: 'budget.burn_rate.80pct',
          severity: 'high',
          message: `Budget mensal atingiu ${burnPct.toFixed(1)}%: $${totalUsd.toFixed(2)} / $${budgetUsd} USD.`,
          resolved: false,
        },
      })
      await dispatchAlert({
        id: created.id,
        type: created.type,
        severity: created.severity,
        message: created.message,
      })
      await redis.set(ALERT_80_KEY, '1', { ex: ALERT_TTL_SECONDS })
      alertFired = '80pct'
    }
  }

  return { totalUsd, budgetUsd, burnPct, alertFired }
}
