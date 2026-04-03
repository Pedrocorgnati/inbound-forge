/**
 * POST /api/v1/content/generate
 * Módulo: module-8-content-generation
 *
 * Wrapper v1 que delega para AngleGenerationService.
 * Aceita { themeId, forceRegenerate?, funnelStage?, targetChannel? } no body.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { GenerateContentSchema } from '@/schemas/content.schema'
import { AngleGenerationService } from '@/lib/services/angle-generation.service'
import {
  ContentBusinessRuleError,
  ContentNotFoundError,
} from '@/lib/errors/content-errors'
import { logAudit } from '@/lib/audit/log'

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = GenerateContentSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const piece = await AngleGenerationService.generate(parsed.data.themeId, {
      forceRegenerate: parsed.data.forceRegenerate ?? false,
      funnelStage: parsed.data.funnelStage,
      targetChannel: parsed.data.targetChannel,
    })

    await logAudit({
      action: 'content.generate',
      entityType: 'ContentPiece',
      entityId: piece.id,
      operatorId: user!.id,
      metadata: { themeId: parsed.data.themeId, source: 'v1' },
    })

    return ok(piece)
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      return notFound('Tema não encontrado')
    }
    if (error instanceof ContentBusinessRuleError) {
      const statusMap: Record<string, number> = {
        CONTENT_050: 422,
        CONTENT_051: 422,
        CONTENT_052: 502,
        CONTENT_053: 422,
        SYS_001: 503,
        CONTENT_002: 404,
      }
      const status = statusMap[error.code] ?? 500
      return new Response(
        JSON.stringify({ error: error.code, message: error.message }),
        { status, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.error('[POST /api/v1/content/generate]', error)
    return internalError()
  }
}
