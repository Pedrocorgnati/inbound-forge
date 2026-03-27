/**
 * POST /api/content/[themeId]/reject
 * Módulo: module-8-content-generation (TASK-3/ST002)
 *
 * Rejeita um ContentPiece e cria ContentRejection com motivo.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { RejectContentDto } from '@/lib/dtos/content-piece.dto'
import { ContentApprovalService } from '@/lib/services/content-approval.service'
import {
  buildContentError,
  ContentBusinessRuleError,
  ContentNotFoundError,
} from '@/lib/errors/content-errors'

interface Params {
  params: Promise<{ themeId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId } = await params

  // Validate body
  const body = await request.json().catch(() => ({}))
  const parsed = RejectContentDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_062', 422, { details: parsed.error.flatten() })
  }

  // Find ContentPiece for this theme
  const piece = await prisma.contentPiece.findFirst({
    where: { themeId },
    select: { id: true },
  })

  if (!piece) {
    return buildContentError('CONTENT_080', 404)
  }

  try {
    const updated = await ContentApprovalService.reject(
      piece.id,
      parsed.data.reason,
      user!.id,
      parsed.data.angle
    )
    return ok(updated)
  } catch (error) {
    if (error instanceof ContentBusinessRuleError) {
      return buildContentError(error.code as Parameters<typeof buildContentError>[0], 422)
    }
    if (error instanceof ContentNotFoundError) {
      return buildContentError('CONTENT_080', 404)
    }
    console.error('[POST /api/content/reject]', error)
    return buildContentError('DB_002', 500)
  }
}
