/**
 * PATCH /api/content/[themeId]/angles/[angleId]
 * Módulo: module-8-content-generation (TASK-2/ST001 + ST006)
 *
 * Atualiza editedBody ou isSelected de um ângulo.
 * isSelected usa transação para garantir unicidade.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { UpdateAngleDto } from '@/lib/dtos/content-piece.dto'
import { buildContentError } from '@/lib/errors/content-errors'

interface Params {
  params: Promise<{ themeId: string; angleId: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId, angleId } = await params

  // Validate request body
  const body = await request.json().catch(() => ({}))
  const parsed = UpdateAngleDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_002', 422, { details: parsed.error.flatten() })
  }

  // Verify angle exists and belongs to correct theme
  const angle = await prisma.contentAngleVariant.findUnique({
    where: { id: angleId },
    include: { piece: { select: { themeId: true } } },
  })

  if (!angle) {
    return buildContentError('CONTENT_090', 404)
  }

  if (angle.piece.themeId !== themeId) {
    return buildContentError('CONTENT_001', 403)
  }

  const { editedBody, isSelected } = parsed.data

  // If isSelected, use transaction to ensure only one angle is selected
  if (isSelected) {
    const updated = await prisma.$transaction(async (tx) => {
      // Deselect all other angles for this ContentPiece
      await tx.contentAngleVariant.updateMany({
        where: {
          pieceId: angle.pieceId,
          id: { not: angleId },
        },
        data: { isSelected: false },
      })

      // Select this angle
      return tx.contentAngleVariant.update({
        where: { id: angleId },
        data: {
          isSelected: true,
          ...(editedBody !== undefined ? { editedBody } : {}),
        },
      })
    })

    return ok(updated)
  }

  // Simple update (editedBody only)
  const updated = await prisma.contentAngleVariant.update({
    where: { id: angleId },
    data: {
      ...(editedBody !== undefined ? { editedBody } : {}),
    },
  })

  return ok(updated)
}
