/**
 * PATCH /api/v1/attribution/[eventId]/validate
 * Operador valida manualmente o first-touch de um ConversionEvent.
 * Intake Review TASK-5 ST002 (CL-094).
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  ok,
  notFound,
  validationError,
  internalError,
} from '@/lib/api-auth'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ eventId: string }> }

const bodySchema = z.object({
  manuallyValidated: z.boolean(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { eventId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError('JSON invalido')
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const event = await prisma.conversionEvent.findUnique({
      where: { id: eventId },
      include: { lead: { select: { firstTouchThemeId: true } } },
    })
    if (!event) return notFound('ConversionEvent nao encontrado')

    const updated = await prisma.conversionEvent.update({
      where: { id: eventId },
      data: {
        manuallyValidated: parsed.data.manuallyValidated,
        validatedAt: parsed.data.manuallyValidated ? new Date() : null,
        validatedBy: parsed.data.manuallyValidated ? user!.id : null,
      },
    })

    // Recalcular scoring — overwrite manual deve influenciar ranking
    await updateThemeConversionScore(event.lead.firstTouchThemeId)

    await auditLog({
      action: 'conversion.validation_changed',
      entityType: 'ConversionEvent',
      entityId: eventId,
      userId: user!.id,
      leadId: event.leadId,
      metadata: { manuallyValidated: parsed.data.manuallyValidated },
    })

    return ok(updated)
  } catch (err) {
    console.error('[PATCH /api/v1/attribution/:eventId/validate]', err)
    return internalError()
  }
}
