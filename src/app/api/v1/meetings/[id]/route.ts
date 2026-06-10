import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, badRequest, notFound, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.object({
  bookingStatus: z.enum(['confirmed', 'cancelled', 'canceled', 'completed', 'no_show']).optional(),
  notes: z.string().max(1000).nullable().optional(),
})

type Params = { params: Promise<{ id: string }> }

// PATCH /api/v1/meetings/[id]
// Atualiza status e notas sem expor PII.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('VAL_001: body JSON obrigatório')
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Dados inválidos'}`)
  }

  if (parsed.data.bookingStatus === undefined && parsed.data.notes === undefined) {
    return badRequest('VAL_001: informe bookingStatus ou notes')
  }

  try {
    const existing = await prisma.conversionEvent.findUnique({
      where: { id },
      select: { id: true, leadId: true, type: true },
    })

    if (!existing || !['MEETING', 'CALENDAR_BOOKING'].includes(existing.type)) {
      return notFound('Meeting não encontrado')
    }

    const updated = await prisma.conversionEvent.update({
      where: { id },
      data: {
        ...(parsed.data.bookingStatus !== undefined ? { bookingStatus: parsed.data.bookingStatus } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    })

    auditLog({
      action: 'meeting.updated',
      entityType: 'ConversionEvent',
      entityId: id,
      userId: user!.id,
      leadId: existing.leadId,
      metadata: { bookingStatus: updated.bookingStatus },
    }).catch(() => {})

    return ok(updated)
  } catch (err) {
    console.error('[meetings] PATCH error:', err)
    return internalError()
  }
}
