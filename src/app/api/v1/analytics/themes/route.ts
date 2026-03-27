import { NextRequest } from 'next/server'
import { requireSession, okPaginated, badRequest } from '@/lib/api-auth'
import { getThemeRanking } from '@/lib/analytics-queries'

// GET /api/v1/analytics/themes?period=&page=&limit=&sortBy=conversionScore|leadsCount
// INT-027, INT-041 | ANALYTICS_001: período inválido | ANALYTICS_020: sortBy inválido
export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const sortByParam = searchParams.get('sortBy') ?? 'conversionScore'
  const sortDirParam = searchParams.get('sortDir') ?? 'desc'

  const validSortBy = ['conversionScore', 'leadsCount']
  if (!validSortBy.includes(sortByParam)) {
    return badRequest(`ANALYTICS_020: sortBy inválido. Use: ${validSortBy.join(', ')}`)
  }

  const validSortDir = ['asc', 'desc']
  if (!validSortDir.includes(sortDirParam)) {
    return badRequest(`ANALYTICS_020: sortDir inválido. Use: ${validSortDir.join(', ')}`)
  }

  try {
    const result = await getThemeRanking(
      user!.id,
      sortByParam as 'conversionScore' | 'leadsCount',
      page,
      limit,
      period,
      sortDirParam as 'asc' | 'desc'
    )

    return okPaginated(result.items, { page, limit, total: result.total })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar ranking'
    if (message.startsWith('ANALYTICS_020') || message.startsWith('ANALYTICS_001')) {
      return badRequest(message)
    }
    return badRequest('Erro ao processar ranking de temas')
  }
}
