// TASK-2 ST003 (CL-138) — Endpoint dedicado de reschedule.
// PATCH /api/v1/posts/[id]/reschedule
// Wrapper finos sobre PATCH /api/v1/posts/[id] com contrato enxuto:
//   body: { scheduledAt: ISO-8601 string }
//   200: updated post
//   400: body invalido
//   404: post nao encontrado
//   409: slot ocupado

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  internalError,
  conflict,
} from '@/lib/api-auth'
import { checkSlot, type SlotChannel } from '@/lib/publishing/slotValidator'
import { writePublishAudit, computeDelta } from '@/lib/publishing/auditLog'

type Params = { params: Promise<{ id: string }> }

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime({ message: 'scheduledAt deve ser ISO-8601' }),
})

const IMMUTABLE_STATUSES = ['PUBLISHED', 'CANCELLED', 'ROLLED_BACK'] as const

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body invalido'))
  }

  const parsed = rescheduleSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return notFound('Post nao encontrado')

    if (IMMUTABLE_STATUSES.includes(existing.status as (typeof IMMUTABLE_STATUSES)[number])) {
      return conflict(`Post com status ${existing.status} nao pode ser reagendado`)
    }

    const nextScheduledAt = new Date(parsed.data.scheduledAt)

    if (nextScheduledAt.getTime() <= Date.now()) {
      return validationError(new Error('scheduledAt nao pode ser no passado'))
    }

    const slot = await checkSlot({
      channel: existing.channel as SlotChannel,
      scheduledAt: nextScheduledAt,
      ignorePostId: id,
    })
    if (!slot.ok) return conflict(slot.message ?? 'Slot indisponivel')

    const updated = await prisma.post.update({
      where: { id },
      data: { scheduledAt: nextScheduledAt },
    })

    const delta = computeDelta(
      existing as unknown as Record<string, unknown>,
      { scheduledAt: nextScheduledAt } as Record<string, unknown>,
    )
    if (Object.keys(delta).length > 0) {
      await writePublishAudit({
        postId: id,
        operatorId: user!.id,
        action: 'reschedule',
        delta,
      })
    }

    return ok(updated)
  } catch {
    return internalError()
  }
}
