import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, badRequest } from '@/lib/api-auth'
import { analyticsService } from '@/lib/services/analytics.service'

// GET /api/v1/analytics/ga4?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&metrics=pageViews,sessions
// CL-067 — Integração GA4 Data API com fallback para dados internos

const QuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate deve ser YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate deve ser YYYY-MM-DD'),
  metrics: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)

  const parsed = QuerySchema.safeParse({
    startDate: searchParams.get('startDate') ?? '',
    endDate: searchParams.get('endDate') ?? '',
    metrics: searchParams.get('metrics') ?? undefined,
  })

  if (!parsed.success) {
    return badRequest(parsed.error.errors.map((e) => e.message).join('; '))
  }

  const { startDate, endDate, metrics } = parsed.data
  const metricsList = metrics ? metrics.split(',').map((m) => m.trim()) : ['pageViews', 'sessions']

  try {
    const result = await analyticsService.getGA4Report(startDate, endDate, metricsList)
    return ok(result)
  } catch (err) {
    console.error('[ga4 route] Erro:', err)
    return badRequest('Erro ao buscar dados GA4')
  }
}
