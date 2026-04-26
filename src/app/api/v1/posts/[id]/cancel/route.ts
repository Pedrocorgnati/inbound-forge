/**
 * POST /api/v1/posts/[id]/cancel — Intake-Review TASK-1 ST001 (CL-224)
 * Transiciona post agendado para status=CANCELLED, cancela job na fila,
 * grava PublishAuditLog com action=cancel.
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  conflict,
  internalError,
} from '@/lib/api-auth'
import { writePublishAudit } from '@/lib/publishing/auditLog'

type Params = { params: Promise<{ id: string }> }

const NON_CANCELLABLE = ['PUBLISHED', 'CANCELLED', 'ROLLED_BACK'] as const

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post nao encontrado')

    if (NON_CANCELLABLE.includes(existing.status as (typeof NON_CANCELLABLE)[number])) {
      return conflict(`Post com status ${existing.status} nao pode ser cancelado`)
    }

    const now = new Date()
    const updated = await prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledByOperatorId: user!.id,
        },
      })

      await tx.publishingQueue.updateMany({
        where: { postId: id, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'CANCELLED' },
      })

      return post
    })

    await writePublishAudit({
      postId: id,
      operatorId: user!.id,
      action: 'cancel',
      delta: {
        status: { from: existing.status, to: 'CANCELLED' },
        cancelledAt: { from: null, to: now.toISOString() },
      },
    })

    return ok(updated)
  } catch {
    return internalError()
  }
}
