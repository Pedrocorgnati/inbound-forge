// TASK-12 (CL-254): lista versoes (ContentAngleVariant) de um ContentPiece.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ pieceId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { pieceId } = await params
  try {
    const piece = await prisma.contentPiece.findUnique({ where: { id: pieceId } })
    if (!piece) return notFound('Peça não encontrada')

    const variants = await prisma.contentAngleVariant.findMany({
      where: { pieceId },
      orderBy: [{ generationVersion: 'desc' }, { createdAt: 'desc' }],
    })

    return ok({ pieceId, current: piece.selectedAngle, variants })
  } catch {
    return internalError()
  }
}
