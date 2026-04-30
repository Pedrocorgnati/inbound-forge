import { NextRequest } from 'next/server'
import { requireSession, ok, badRequest } from '@/lib/api-auth'
import { getChannelPerformance } from '@/lib/analytics-queries'

// GET /api/v1/analytics/channels?period=7d|30d|90d
// MS13-B005 — expõe ChannelPerformance ao frontend (P3)
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'

  try {
    const data = await getChannelPerformance(period, user!.id)
    return ok({ period, channels: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar métricas por canal'
    if (message.startsWith('ANALYTICS_020') || message.startsWith('ANALYTICS_001')) {
      return badRequest(message)
    }
    return badRequest('Erro ao processar métricas por canal')
  }
}
