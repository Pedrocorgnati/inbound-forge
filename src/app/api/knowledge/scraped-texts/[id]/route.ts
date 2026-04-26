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
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { findScrapedTextById, overrideClassification } from '@/lib/services/classification.service'

const PatchSchema = z.object({
  isPainCandidate: z.boolean({ required_error: 'isPainCandidate é obrigatório' }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  try {
    const item = await findScrapedTextById(id, user!.id)
    if (!item) return notFound('Texto não encontrado.')

    return ok(item)
  } catch (err) {
    console.error(`[ScrapedTexts] GET /${id} error`, err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let raw: unknown
  try { raw = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const bodyParsed = PatchSchema.safeParse(raw)
  if (!bodyParsed.success) return validationError(bodyParsed.error)

  try {
    // operator.id == Supabase user.id
    const result = await overrideClassification(id, user!.id, bodyParsed.data.isPainCandidate)

    if (result === 'NOT_FOUND') return notFound('Texto não encontrado.')

    if (result === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, code: 'AUTH_003', error: 'Acesso negado a este recurso.' },
        { status: 403 }
      )
    }

    return ok(result)
  } catch (err) {
    console.error(`[ScrapedTexts] PATCH /${id} error`, err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
