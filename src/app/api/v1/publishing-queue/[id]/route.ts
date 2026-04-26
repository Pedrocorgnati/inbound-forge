/**
 * DELETE /api/v1/publishing-queue/[id] — remove scheduled queue item
 * PATCH  /api/v1/publishing-queue/[id] — pause/resume queue item
 *
 * Intake Review TASK-4 ST001 (CL-234, CL-235).
 * - DELETE proibido quando post ja foi publicado (conflict 409)
 * - PATCH alterna status entre PENDING <-> PAUSED (worker ignora PAUSED)
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  conflict,
  internalError,
} from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum(['PAUSED', 'PENDING']),
})

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params

  try {
    const item = await prisma.publishingQueue.findUnique({
      where: { id },
      include: { post: { select: { id: true, status: true } } },
    })
    if (!item) return notFound('Item da fila nao encontrado')

    if (item.post.status === 'PUBLISHED') {
      return conflict('Nao e possivel remover item ja publicado')
    }

    await prisma.publishingQueue.delete({ where: { id } })

    await auditLog({
      action: 'publishing_queue.deleted',
      entityType: 'PublishingQueue',
      entityId: id,
      userId: user!.id,
      metadata: { postId: item.postId, previousStatus: item.status },
    })

    return ok({ success: true }, 200)
  } catch (err) {
    console.error('[DELETE /api/v1/publishing-queue/:id]', err)
    return internalError()
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError('JSON invalido')
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const item = await prisma.publishingQueue.findUnique({ where: { id } })
    if (!item) return notFound('Item da fila nao encontrado')

    // Only allow pause/resume on items that haven't started or finished.
    if (item.status === 'PROCESSING' || item.status === 'DONE' || item.status === 'FAILED') {
      return conflict(`Nao e possivel alterar item em status ${item.status}`)
    }

    const updated = await prisma.publishingQueue.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    await auditLog({
      action: 'publishing_queue.status_changed',
      entityType: 'PublishingQueue',
      entityId: id,
      userId: user!.id,
      metadata: { from: item.status, to: parsed.data.status },
    })

    return ok(updated)
  } catch (err) {
    console.error('[PATCH /api/v1/publishing-queue/:id]', err)
    return internalError()
  }
}
