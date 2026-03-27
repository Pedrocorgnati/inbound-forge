/**
 * POST /api/content/[themeId]/generate
 * Módulo: module-8-content-generation (TASK-1/ST003)
 *
 * Dispara geração de 3 ângulos via Claude.
 * Idempotente: retorna existentes se forceRegenerate=false.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { GenerateAnglesDto } from '@/lib/dtos/content-piece.dto'
import { AngleGenerationService } from '@/lib/services/angle-generation.service'
import { buildContentError, ContentBusinessRuleError, ContentNotFoundError } from '@/lib/errors/content-errors'
import { logAudit } from '@/lib/audit/log'

interface Params {
  params: Promise<{ themeId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId } = await params

  // Parse body
  const body = await request.json().catch(() => ({}))
  const parsed = GenerateAnglesDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_002', 422, { details: parsed.error.flatten() })
  }

  try {
    const piece = await AngleGenerationService.generate(themeId, parsed.data)

    await logAudit({
      action: 'content.generate',
      entityType: 'ContentPiece',
      entityId: piece.id,
      operatorId: user!.id,
      metadata: { themeId, forceRegenerate: parsed.data.forceRegenerate },
    })

    return ok(piece)
  } catch (error) {
    if (error instanceof ContentBusinessRuleError) {
      const codeToStatus: Record<string, number> = {
        CONTENT_050: 422,
        CONTENT_051: 422,
        CONTENT_052: 502,
        CONTENT_053: 422,
        SYS_001: 503,
        CONTENT_002: 404,
      }
      const status = codeToStatus[error.code] ?? 500
      return buildContentError(error.code as Parameters<typeof buildContentError>[0], status)
    }
    if (error instanceof ContentNotFoundError) {
      return buildContentError('CONTENT_002', 404)
    }
    console.error('[POST /api/content/generate]', error)
    return buildContentError('SYS_001', 503)
  }
}
