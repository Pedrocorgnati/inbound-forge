/**
 * GET /api/v1/analytics/ltr-status
 * TASK-3 ST005 / intake-review LTR Engine
 *
 * Status atual do Learn-to-Rank com progresso para o dashboard (CL-030).
 * AUTH_001: JWT obrigatório.
 */
import { requireSession, ok } from '@/lib/api-auth'
import { getLtrStatus } from '@/lib/services/learn-to-rank.service'

export async function GET() {
  const { response: authError } = await requireSession()
  if (authError) return authError

  const status = await getLtrStatus()
  return ok(status)
}
