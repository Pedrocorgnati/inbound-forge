/**
 * Rastreabilidade: CL-197, CL-198, TASK-3 ST002
 * Calcula divergência entre ConversionEvent (observed) e ReconciliationItem (expected).
 */
import { prisma } from '@/lib/prisma'

export interface ReconciliationCalc {
  postId: string | null
  leadId: string | null
  expected: number
  observed: number
  diffPct: number
  isDivergent: boolean
}

const DIVERGENCE_THRESHOLD = 0.05

export async function calculateReconciliation(
  itemPostId: string | null,
  itemLeadId: string | null,
): Promise<Pick<ReconciliationCalc, 'expected' | 'observed' | 'diffPct' | 'isDivergent'>> {
  const [expected, observed] = await Promise.all([
    // Expected: clicks em UTMLinks para o post
    itemPostId
      ? prisma.uTMLink.aggregate({
          where: { postId: itemPostId },
          _sum: { clicks: true },
        }).then((r) => r._sum.clicks ?? 0)
      : Promise.resolve(1),

    // Observed: ConversionEvents associados ao lead
    itemLeadId
      ? prisma.conversionEvent.count({ where: { leadId: itemLeadId } })
      : Promise.resolve(0),
  ])

  const base = Math.max(expected, 1)
  const diffPct = Math.abs(expected - observed) / base

  return {
    expected,
    observed,
    diffPct: diffPct * 100,
    isDivergent: diffPct > DIVERGENCE_THRESHOLD,
  }
}
