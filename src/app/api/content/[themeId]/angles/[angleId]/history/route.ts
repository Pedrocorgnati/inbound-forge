/**
 * GET /api/content/[themeId]/angles/[angleId]/history
 * Módulo: module-8-content-generation (TASK-5/ST001+ST005)
 *
 * Retorna histórico de versões de um ContentAngleVariant, ordenadas por generationVersion DESC.
 * Ownership chain: contentPiece.themeId === themeId (session auth garante operador)
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildContentError } from '@/lib/errors/content-errors'

interface Params {
  params: Promise<{ themeId: string; angleId: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId, angleId } = await params

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const skip = (page - 1) * limit

  // Verify angle exists with piece relation for ownership check
  const angle = await prisma.contentAngleVariant.findUnique({
    where: { id: angleId },
    select: {
      id: true,
      angle: true,
      pieceId: true,
      piece: {
        select: { themeId: true },
      },
    },
  })

  if (!angle) {
    return buildContentError('CONTENT_090', 404)
  }

  // Ownership check: themeId from URL must match the piece's theme (SEC-007)
  if (angle.piece.themeId !== themeId) {
    return buildContentError('CONTENT_001', 403)
  }

  // Fetch all versions of this angle type for this content piece
  const [versions, total] = await Promise.all([
    prisma.contentAngleVariant.findMany({
      where: {
        pieceId: angle.pieceId,
        angle: angle.angle,
      },
      orderBy: { generationVersion: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        angle: true,
        generationVersion: true,
        text: true,
        editedBody: true,
        charCount: true,
        hashtags: true,
        ctaText: true,
        isSelected: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.contentAngleVariant.count({
      where: {
        pieceId: angle.pieceId,
        angle: angle.angle,
      },
    }),
  ])

  return ok({ data: versions, total, page, limit })
}
