/**
 * PATCH /api/v1/notifications/[id]/read — Intake Review TASK-11 ST002 (CL-246).
 * Marca uma notificacao individual como lida.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await ctx.params
  try {
    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing) return notFound('Notificacao nao encontrada')
    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    })
    return ok(updated)
  } catch (err) {
    console.error('[PATCH /api/v1/notifications/[id]/read]', err)
    return internalError()
  }
}
