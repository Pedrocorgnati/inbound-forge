// GET|POST /api/v1/themes/:id/niche-opportunity
// Módulo: module-7-theme-scoring-engine (TASK-2/ST003)
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'
import { NicheOpportunitySchema } from '@/schemas/theme.schema'
import { nicheOpportunityService } from '@/services/niche-opportunity.service'

type Params = { params: Promise<{ id: string }> }

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const nicheOpp = await nicheOpportunityService.getByThemeId(id)
    return ok(nicheOpp) // null se não existir
  } catch (err) {
    const typedErr = err as { code?: string }
    if (typedErr?.code === 'THEME_080') {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }
    console.error('[GET /themes/:id/niche-opportunity]', err)
    return internalError()
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = NicheOpportunitySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const nicheOpp = await nicheOpportunityService.upsertForTheme(id, {
      isGeoReady: parsed.data.isGeoReady,
      description: parsed.data.description,
    })
    return ok(nicheOpp)
  } catch (err) {
    const typedErr = err as { code?: string }
    if (typedErr?.code === 'THEME_080') {
      const { status, body: errBody } = apiError('THEME_080')
      return NextResponse.json(errBody, { status })
    }
    console.error('[POST /themes/:id/niche-opportunity]', err)
    return internalError()
  }
}
