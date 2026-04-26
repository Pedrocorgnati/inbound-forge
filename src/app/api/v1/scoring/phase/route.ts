/**
 * GET /api/v1/scoring/phase — Intake Review TASK-6 ST003 (CL-096).
 * Retorna fase atual do scoring (PRE_LTR ou POST_LTR) e progresso ate o threshold.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { getScoringPhase } from '@/lib/services/ltr-threshold.service'

export async function GET(_req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const snapshot = await getScoringPhase()
    return ok(snapshot)
  } catch (err) {
    console.error('[GET /api/v1/scoring/phase]', err)
    return internalError()
  }
}
