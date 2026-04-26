// TASK-12 (CL-254): restaura uma versao (ContentAngleVariant) como selecionada.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const RestoreSchema = z.object({ variantId: z.string().uuid() })

type Params = { params: Promise<{ pieceId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { pieceId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = RestoreSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const variant = await prisma.contentAngleVariant.findUnique({
      where: { id: parsed.data.variantId },
    })
    if (!variant || variant.pieceId !== pieceId) {
      return notFound('Versão não encontrada')
    }

    await prisma.$transaction([
      prisma.contentAngleVariant.updateMany({
        where: { pieceId },
        data: { isSelected: false },
      }),
      prisma.contentAngleVariant.update({
        where: { id: variant.id },
        data: { isSelected: true },
      }),
      prisma.contentPiece.update({
        where: { id: pieceId },
        data: { selectedAngle: variant.angle, editedText: variant.editedBody ?? variant.text },
      }),
    ])

    if (user?.id) {
      await auditLog({
        action: 'restore_content_version',
        entityType: 'ContentPiece',
        entityId: pieceId,
        userId: user.id,
        metadata: { variantId: variant.id, version: variant.generationVersion },
      }).catch(() => undefined)
    }

    return ok({ pieceId, variantId: variant.id })
  } catch {
    return internalError()
  }
}
