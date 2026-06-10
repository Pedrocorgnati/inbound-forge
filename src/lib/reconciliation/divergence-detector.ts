/**
 * Rastreabilidade: CL-198, TASK-3 ST003
 * Cria AlertLog quando ReconciliationItem tem divergência > 5%.
 * Dedup: não cria 2 alerts no mesmo dia para o mesmo item.
 */
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

const DEDUP_TTL_SECONDS = 24 * 3600

function alertDedupKey(itemId: string): string {
  return `reconciliation:alert:${itemId}`
}

export interface DivergenceAlertRecord {
  id: string
  type: string
  severity: string
  message: string
}

export async function createDivergenceAlert(
  itemId: string,
  expected: number,
  observed: number,
  diffPct: number,
): Promise<DivergenceAlertRecord | null> {
  const dedupKey = alertDedupKey(itemId)
  const alreadyAlerted = await redis.get<string>(dedupKey)
  if (alreadyAlerted) return null

  const created = await prisma.alertLog.create({
    data: {
      type: `reconciliation.divergence:${itemId}`,
      severity: 'high',
      message: `Divergência detectada em ReconciliationItem ${itemId}: expected=${expected}, observed=${observed}, diff=${diffPct.toFixed(1)}%`,
      resolved: false,
    },
  })

  await redis.set(dedupKey, created.id, { ex: DEDUP_TTL_SECONDS })

  return { id: created.id, type: created.type, severity: created.severity, message: created.message }
}
