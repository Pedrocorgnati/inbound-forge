/**
 * GET /api/knowledge/scraped-texts
 * TASK-2 ST003 / module-6-scraping-worker
 *
 * Lista textos classificados do operador autenticado.
 * AUTH_001: JWT obrigatório.
 * PERF-002: paginação máx 100 por página.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { findScrapedTexts } from '@/lib/services/classification.service'

export async function GET(request: NextRequest) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const isPainCandidateParam = searchParams.get('isPainCandidate')
  const batchId = searchParams.get('batchId') ?? undefined
  const sourceId = searchParams.get('sourceId') ?? undefined

  const isPainCandidate =
    isPainCandidateParam === 'true' ? true
    : isPainCandidateParam === 'false' ? false
    : undefined

  try {
    // operator.id == Supabase user.id (ver onboarding/progress/route.ts)
    const result = await findScrapedTexts(user!.id, {
      isPainCandidate,
      batchId,
      sourceId,
      page,
      limit,
    })

    return ok(result)
  } catch (err) {
    console.error('[ScrapedTexts] GET error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
