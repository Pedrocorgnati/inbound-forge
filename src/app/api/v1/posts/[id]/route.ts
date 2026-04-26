import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  internalError,
  conflict,
} from '@/lib/api-auth'
import { updatePostSchema as UpdatePostSchema } from '@/lib/validators/post'
import { checkSlot, type SlotChannel } from '@/lib/publishing/slotValidator'
import { writePublishAudit, computeDelta } from '@/lib/publishing/auditLog'

type Params = { params: Promise<{ id: string }> }

const IMMUTABLE_STATUSES = ['PUBLISHED', 'CANCELLED', 'ROLLED_BACK'] as const

// PUT /api/v1/posts/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = UpdatePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post não encontrado')

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
      },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}

// PATCH /api/v1/posts/[id] — Intake-Review TASK-1 ST002 (CL-225)
// Edicao parcial com validacao de status e conflito de slot.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body invalido')) }

  const parsed = UpdatePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post nao encontrado')

    if (IMMUTABLE_STATUSES.includes(existing.status as (typeof IMMUTABLE_STATUSES)[number])) {
      return conflict(`Post com status ${existing.status} nao pode ser editado`)
    }

    const nextScheduledAt = parsed.data.scheduledAt
      ? new Date(parsed.data.scheduledAt)
      : existing.scheduledAt
    const nextChannel = (parsed.data.channel ?? existing.channel) as SlotChannel

    const scheduleChanged =
      (parsed.data.scheduledAt && nextScheduledAt?.getTime() !== existing.scheduledAt?.getTime()) ||
      (parsed.data.channel && parsed.data.channel !== existing.channel)

    if (scheduleChanged && nextScheduledAt) {
      const slot = await checkSlot({
        channel: nextChannel,
        scheduledAt: nextScheduledAt,
        ignorePostId: id,
      })
      if (!slot.ok) return conflict(slot.message ?? 'Slot indisponivel')
    }

    const data = {
      ...parsed.data,
      ...(parsed.data.scheduledAt ? { scheduledAt: nextScheduledAt } : {}),
    }

    const updated = await prisma.post.update({ where: { id }, data })

    const delta = computeDelta(existing as unknown as Record<string, unknown>, data)
    if (Object.keys(delta).length > 0) {
      await writePublishAudit({
        postId: id,
        operatorId: user!.id,
        action: 'edit',
        delta,
      })
    }

    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/posts/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post não encontrado')

    await prisma.post.delete({ where: { id } })
    return ok({ message: 'Post removido' })
  } catch {
    return internalError()
  }
}
