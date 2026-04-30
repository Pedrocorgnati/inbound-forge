import { requireSession, ok, badRequest } from '@/lib/api-auth'
import { reconcileGA4Metrics } from '@/lib/analytics-reconciliation'

// GET /api/v1/analytics/ga4-reconciliation
// TASK-9 | A-008 | COMP-003: sem PII — apenas contagens agregadas
export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const report = await reconcileGA4Metrics()
    return ok(report)
  } catch (err) {
    console.error('[ga4-reconciliation] Erro:', err instanceof Error ? err.message : 'unknown')
    return badRequest('Erro ao calcular reconciliação GA4')
  }
}
