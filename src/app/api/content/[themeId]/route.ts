/**
 * GET /api/content/[themeId]
 * Módulo: module-8-content-generation (TASK-2/ST001)
 *
 * Retorna ContentPiece com angles para o tema.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildContentError } from '@/lib/errors/content-errors'

interface Params {
  params: Promise<{ themeId: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId } = await params

  const piece = await prisma.contentPiece.findFirst({
    where: { themeId },
    include: {
      angles: {
        orderBy: [{ generationVersion: 'desc' }, { angle: 'asc' }],
      },
    },
  })

  if (!piece) {
    return buildContentError('CONTENT_080', 404)
  }

  return ok(piece)
}
