/**
 * GET /api/knowledge/scraped-texts/:id
 * PATCH /api/knowledge/scraped-texts/:id
 * TASK-2 ST003 / module-6-scraping-worker
 *
 * Detalhe e override manual de classificação.
 * AUTH_001: JWT obrigatório.
 * SEC-007: ownership check antes de PATCH — AUTH_003 se violado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, notFound, badRequest, internalError } from '@/lib/api-auth'
import { findScrapedTextById, overrideClassification } from '@/lib/services/classification.service'

const PatchSchema = z.object({
  isPainCandidate: z.boolean({ required_error: 'isPainCandidate é obrigatório' }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  try {
    // operator.id == Supabase user.id
    const item = await findScrapedTextById(params.id, user!.id)
    if (!item) return notFound('Texto não encontrado.')

    return ok(item)
  } catch (err) {
    console.error(`[ScrapedTexts] GET /${params.id} error`, err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  let body: z.infer<typeof PatchSchema>
  try {
    const raw = await request.json()
    body = PatchSchema.parse(raw)
  } catch {
    return badRequest('isPainCandidate é obrigatório e deve ser boolean.')
  }

  try {
    // operator.id == Supabase user.id
    const result = await overrideClassification(params.id, user!.id, body.isPainCandidate)

    if (result === 'NOT_FOUND') return notFound('Texto não encontrado.')

    if (result === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, code: 'AUTH_003', error: 'Acesso negado a este recurso.' },
        { status: 403 }
      )
    }

    return ok(result)
  } catch (err) {
    console.error(`[ScrapedTexts] PATCH /${params.id} error`, err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
