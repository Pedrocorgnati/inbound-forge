/**
 * Rastreabilidade: CL-180, CL-197, TASK-3 ST002
 * Worker de reconciliação semanal — idempotente via idempotency key no Redis.
 * Processa ReconciliationItem com resolved=false (pending/outdated).
 * Divergência > 5%: cria AlertLog. <= 5%: marca resolved=true.
 */
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { calculateReconciliation } from '@/lib/reconciliation/calculator'
import { createDivergenceAlert } from '@/lib/reconciliation/divergence-detector'
import { dispatchAlert } from '@/lib/alerts/dispatcher'
import { captureException } from '@/lib/sentry'

const TTL_IDEMPOTENCY = 8 * 24 * 3600

function getIsoWeek(): string {
  const d = new Date()
  const year = d.getFullYear()
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export interface ReconciliationResult {
  processed: number
  reconciled: number
  divergent: number
  skipped: boolean
}

export async function run(force = false): Promise<ReconciliationResult> {
  const isoWeek = getIsoWeek()
  const idempotencyKey = `reconciliation:weekly:${isoWeek}`
  const correlationId = randomUUID()

  if (!force) {
    const alreadyRan = await redis.get<string>(idempotencyKey)
    if (alreadyRan) {
      console.info(`[reconciliation.worker] skipped (already ran ${isoWeek}) | correlationId=${correlationId}`)
      return { processed: 0, reconciled: 0, divergent: 0, skipped: true }
    }
  }

  console.info(`[reconciliation.worker] start | week=${isoWeek} correlationId=${correlationId}`)

  // WorkerHealth: marcar running
  await prisma.workerHealth.upsert({
    where: { type: 'SCRAPING' },
    update: { status: 'ACTIVE', lastHeartbeat: new Date(), errorMessage: null },
    create: { type: 'SCRAPING', status: 'ACTIVE', lastHeartbeat: new Date() },
  }).catch(() => null)

  const items = await prisma.reconciliationItem.findMany({
    where: { resolved: false },
    take: 1000,
  })

  let reconciled = 0
  let divergent = 0

  for (const item of items) {
    try {
      const calc = await calculateReconciliation(item.postId, item.leadId)

      if (calc.isDivergent) {
        await prisma.reconciliationItem.update({
          where: { id: item.id },
          data: {
            resolution: JSON.stringify({
              expected: calc.expected,
              observed: calc.observed,
              diff_pct: calc.diffPct,
              week: isoWeek,
            }),
          },
        })

        const alert = await createDivergenceAlert(item.id, calc.expected, calc.observed, calc.diffPct)
        if (alert) {
          dispatchAlert({ id: alert.id, type: alert.type, severity: alert.severity, message: alert.message }).catch(
            (err) => console.warn('[reconciliation.worker] dispatch error:', err),
          )
        }
        divergent++
      } else {
        await prisma.reconciliationItem.update({
          where: { id: item.id },
          data: { resolved: true, resolution: `reconciled:${isoWeek}` },
        })
        reconciled++
      }
    } catch (err) {
      console.error(`[reconciliation.worker] item error | id=${item.id}`, err)
    }
  }

  await redis.set(idempotencyKey, correlationId, { ex: TTL_IDEMPOTENCY })

  // WorkerHealth: marcar healthy
  await prisma.workerHealth.upsert({
    where: { type: 'SCRAPING' },
    update: { status: 'IDLE', lastHeartbeat: new Date() },
    create: { type: 'SCRAPING', status: 'IDLE', lastHeartbeat: new Date() },
  }).catch(() => null)

  console.info(
    `[reconciliation.worker] done | week=${isoWeek} processed=${items.length} reconciled=${reconciled} divergent=${divergent}`,
  )

  return { processed: items.length, reconciled, divergent, skipped: false }
}

export async function runWithHealthTracking(force = false): Promise<ReconciliationResult> {
  try {
    return await run(force)
  } catch (err) {
    captureException(err, { context: 'reconciliation.worker' })
    await prisma.workerHealth.upsert({
      where: { type: 'SCRAPING' },
      update: { status: 'ERROR', errorMessage: String(err) },
      create: { type: 'SCRAPING', status: 'ERROR', errorMessage: String(err), lastHeartbeat: new Date() },
    }).catch(() => null)
    throw err
  }
}
