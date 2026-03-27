/**
 * GET    /api/v1/conversions/[id] — Buscar conversão por ID
 * DELETE /api/v1/conversions/[id] — Deletar conversão + CX-01 recalcular score
 * CX-01: updateThemeConversionScore OBRIGATÓRIO após deleção
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

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
