import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { ApproveContentSchema } from '@/schemas/content.schema'
import { CONTENT_STATUS } from '@/constants/status'
import { withIdempotency } from '@/lib/idempotency/middleware'

type Params = { params: Promise<{ pieceId: string }> }

// POST /api/v1/content/[pieceId]/approve
export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response || !user) return response ?? internalError()

  const { pieceId } = await params

  return withIdempotency(request, {
    userId: user.id,
    handler: async () => {
      let body: unknown
      try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

      const parsed = ApproveContentSchema.safeParse(body)
      if (!parsed.success) return validationError(parsed.error)

      try {
        const piece = await prisma.contentPiece.findUnique({
          where: { id: pieceId },
          include: { angles: true },
        })
        if (!piece) return notFound('Peça de conteúdo não encontrada')

        const angle = piece.angles.find((a) => a.angle === parsed.data.angleId)
        if (!angle) return notFound('Ângulo não encontrado')

        // Desmarcar todos os ângulos, marcar o selecionado
        await prisma.contentAngleVariant.updateMany({
          where: { pieceId },
          data: { isSelected: false },
        })
        await prisma.contentAngleVariant.update({
          where: { id: angle.id },
          data: { isSelected: true },
        })

        const updated = await prisma.contentPiece.update({
          where: { id: pieceId },
          data: {
            status: CONTENT_STATUS.APPROVED,
            selectedAngle: angle.angle,
            editedText: parsed.data.editedText ?? piece.editedText,
          },
        })
        return ok(updated)
      } catch {
        return internalError()
      }
    },
  })
}
