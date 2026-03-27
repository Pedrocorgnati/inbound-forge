/**
 * POST /api/content/[themeId]/approve
 * Módulo: module-8-content-generation (TASK-3/ST002)
 *
 * Aprova um ContentPiece com o ângulo selecionado.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { ApproveContentDto } from '@/lib/dtos/content-piece.dto'
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
  const parsed = ApproveContentDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_061', 422, { details: parsed.error.flatten() })
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
    const updated = await ContentApprovalService.approve(
      piece.id,
      parsed.data.selectedAngleId,
      user!.id
    )
    return ok(updated)
  } catch (error) {
    if (error instanceof ContentBusinessRuleError) {
      const statusMap: Record<string, number> = {
        CONTENT_060: 409,
        CONTENT_061: 422,
        DB_002: 500,
      }
      return buildContentError(error.code as Parameters<typeof buildContentError>[0], statusMap[error.code] ?? 422)
    }
    if (error instanceof ContentNotFoundError) {
      return buildContentError('CONTENT_080', 404)
    }
    console.error('[POST /api/content/approve]', error)
    return buildContentError('DB_002', 500)
  }
}
