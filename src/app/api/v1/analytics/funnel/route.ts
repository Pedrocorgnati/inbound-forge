import { NextRequest } from 'next/server'
import { requireSession, ok, badRequest } from '@/lib/api-auth'
import { getFunnelMetrics } from '@/lib/analytics-queries'

// GET /api/v1/analytics/funnel?period=7d|30d|90d
// INT-003, INT-040 | ANALYTICS_001: período inválido
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'

  try {
    const data = await getFunnelMetrics(period, user!.id)
    return ok(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar métricas'
    if (message.startsWith('ANALYTICS_020') || message.startsWith('ANALYTICS_001')) {
      return badRequest(message)
    }
    // SYS_001 está coberto internamente pelo getCachedAnalytics
    return badRequest('Erro ao processar métricas de funil')
  }
}
