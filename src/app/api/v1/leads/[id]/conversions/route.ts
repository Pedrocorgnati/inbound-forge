/**
 * GET  /api/v1/leads/[id]/conversions — Listar conversões de um lead
 * POST /api/v1/leads/[id]/conversions — Registrar conversão + CX-01 + auditLog
 * CX-01: updateThemeConversionScore obrigatório após cada conversão
 * COMP-001: auditLog em criações
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { CreateConversionSchema } from '@/schemas/lead.schema'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/leads/[id]/conversions
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead não encontrado')

    const conversions = await prisma.conversionEvent.findMany({
      where: { leadId: id },
      orderBy: { occurredAt: 'asc' },
    })
    return ok(conversions)
  } catch {
    return internalError()
  }
}

// POST /api/v1/leads/[id]/conversions
export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = CreateConversionSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return notFound('Lead não encontrado')

    const conversion = await prisma.conversionEvent.create({
      data: {
        leadId: id,
        type: parsed.data.type,
        attribution: 'FIRST_TOUCH',
        occurredAt: new Date(parsed.data.occurredAt),
        notes: parsed.data.notes ?? null,
      },
    })

    // CX-01: OBRIGATÓRIO — atualizar score do tema após conversão
    await updateThemeConversionScore(lead.firstTouchThemeId)

    // Audit log (COMP-001) — SEC-008: sem PII
    await auditLog({
      action: 'conversion.created',
      entityType: 'ConversionEvent',
      entityId: conversion.id,
      userId: user!.id,
      leadId: id,
      metadata: {
        type: conversion.type,
        occurredAt: conversion.occurredAt,
        themeId: lead.firstTouchThemeId,
      },
    })

    return ok(conversion, 201)
  } catch {
    return internalError()
  }
}
