/**
 * POST /api/content/[themeId]/angles/[angleId]/restore
 * Módulo: module-8-content-generation (TASK-5/ST001+ST005)
 *
 * Restaura o editedBody da versão atual com o body de uma versão anterior.
 * Ownership chain: contentPiece.themeId === themeId (session auth garante operador)
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildContentError } from '@/lib/errors/content-errors'
import { logAudit } from '@/lib/audit/log'

const RestoreVersionDto = z.object({
  version: z.number().int().positive(),
})

interface Params {
  params: Promise<{ themeId: string; angleId: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { themeId, angleId } = await params

  // Validate body
  const body = await request.json().catch(() => ({}))
  const parsed = RestoreVersionDto.safeParse(body)
  if (!parsed.success) {
    return buildContentError('CONTENT_072', 422, { details: parsed.error.flatten() })
  }

  const { version } = parsed.data

  // Verify current angle exists with piece relation for ownership check
  const currentAngle = await prisma.contentAngleVariant.findUnique({
    where: { id: angleId },
    select: {
      id: true,
      angle: true,
      pieceId: true,
      generationVersion: true,
      piece: {
        select: { themeId: true },
      },
    },
  })

  if (!currentAngle) {
    return buildContentError('CONTENT_090', 404)
  }

  // Ownership check: themeId from URL must match the piece's theme (SEC-007)
  if (currentAngle.piece.themeId !== themeId) {
    return buildContentError('CONTENT_001', 403)
  }

  // Cannot restore current version (CONTENT_092)
  if (version === currentAngle.generationVersion) {
    return buildContentError('CONTENT_092', 422)
  }

  // Find the requested version
  const targetVersion = await prisma.contentAngleVariant.findFirst({
    where: {
      pieceId: currentAngle.pieceId,
      angle: currentAngle.angle,
      generationVersion: version,
    },
    select: {
      id: true,
      text: true,
      editedBody: true,
      generationVersion: true,
    },
  })

  if (!targetVersion) {
    return buildContentError('CONTENT_091', 404)
  }

  // Restore: update editedBody of current angle with body from target version (SEC-008: no body in logs)
  const bodyToRestore = targetVersion.editedBody ?? targetVersion.text

  const updated = await prisma.contentAngleVariant.update({
    where: { id: angleId },
    data: {
      editedBody: bodyToRestore,
      charCount: bodyToRestore.length,
    },
  })

  // Audit log (COMP-001) — SEC-008: no body content logged
  await logAudit({
    action: 'content.angle.restore',
    entityType: 'ContentAngleVariant',
    entityId: angleId,
    operatorId: user!.id,
    metadata: {
      themeId,
      restoredFromVersion: version,
      currentVersion: currentAngle.generationVersion,
    },
  })

  return ok(updated)
}
