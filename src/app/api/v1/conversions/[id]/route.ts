/**
 * GET    /api/v1/conversions/[id] — Buscar conversão por ID
 * DELETE /api/v1/conversions/[id] — Deletar conversão + CX-01 recalcular score
 * CX-01: updateThemeConversionScore OBRIGATÓRIO após deleção
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z
  .object({
    amountBrl: z.number().nonnegative().optional(),
    channel: z.string().max(50).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    bookingStatus: z.string().max(32).nullable().optional(),
    utmCampaign: z.string().max(255).nullable().optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nenhum campo fornecido' })

// GET /api/v1/conversions/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const conversion = await prisma.conversionEvent.findUnique({
      where: { id },
      include: { lead: { select: { id: true, company: true, firstTouchThemeId: true } } },
    })
    if (!conversion) return notFound('ConversionEvent não encontrado')
    return ok(conversion)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/conversions/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const conversion = await prisma.conversionEvent.findUnique({
      where: { id },
      include: { lead: { select: { firstTouchThemeId: true } } },
    })
    if (!conversion) return notFound('ConversionEvent não encontrado')

    const themeId = conversion.lead.firstTouchThemeId

    await prisma.conversionEvent.delete({ where: { id } })

    // CX-01: OBRIGATÓRIO — recalcular score após deleção
    await updateThemeConversionScore(themeId)

    await auditLog({
      action: 'conversion.deleted',
      entityType: 'ConversionEvent',
      entityId: id,
      userId: user!.id,
      leadId: conversion.leadId,
      metadata: { type: conversion.type, themeId },
    })

    return ok({ success: true })
  } catch {
    return internalError()
  }
}

// PATCH /api/v1/conversions/[id] — Intake Review TASK-5 ST001 (CL-238)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('JSON invalido')
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.conversionEvent.findUnique({
      where: { id },
      include: { lead: { select: { firstTouchThemeId: true } } },
    })
    if (!existing) return notFound('ConversionEvent nao encontrado')

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.occurredAt) data.occurredAt = new Date(parsed.data.occurredAt)

    const updated = await prisma.conversionEvent.update({
      where: { id },
      data: data as never,
    })

    if (parsed.data.amountBrl !== undefined || parsed.data.channel !== undefined) {
      await updateThemeConversionScore(existing.lead.firstTouchThemeId)
    }

    await auditLog({
      action: 'conversion.updated',
      entityType: 'ConversionEvent',
      entityId: id,
      userId: user!.id,
      leadId: existing.leadId,
      metadata: { fields: Object.keys(parsed.data) },
    })

    return ok(updated)
  } catch (err) {
    console.error('[PATCH /api/v1/conversions/:id]', err)
    return internalError()
  }
}
