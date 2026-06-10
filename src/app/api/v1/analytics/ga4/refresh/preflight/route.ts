/**
 * POST /api/v1/analytics/ga4/refresh/preflight
 * Declara o impacto de forcar refresh dos dados GA4 (read-only, baixo risco) antes da acao.
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { Ga4RefreshPreflightSchema } from '@/schemas/preflight.schema'
import { estimateOperationImpact } from '@/lib/preflight/operations'

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = Ga4RefreshPreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const impact = await estimateOperationImpact({
      kind: 'ga4-refresh',
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      metrics: parsed.data.metrics,
    })
    return ok(impact)
  } catch (error) {
    console.error('[POST /api/v1/analytics/ga4/refresh/preflight]', error)
    return internalError()
  }
}
