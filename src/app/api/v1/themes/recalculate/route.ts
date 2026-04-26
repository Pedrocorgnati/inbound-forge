/**
 * POST /api/v1/themes/recalculate
 * TASK-3 ST003 / intake-review LTR Engine
 *
 * Dispara recalculo de scores LTR se thresholds atingidos (CL-073).
 * AUTH_001: JWT obrigatório.
 * Invocável manualmente ou por cron scheduler.
 */
import { requireSession, ok } from '@/lib/api-auth'
import { recalculateIfActive } from '@/lib/services/learn-to-rank.service'

export async function POST() {
  const { response: authError } = await requireSession()
  if (authError) return authError

  const result = await recalculateIfActive()

  return ok({
    ...result,
    timestamp: new Date().toISOString(),
  })
}
