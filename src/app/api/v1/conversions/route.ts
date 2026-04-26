/**
 * GET  /api/v1/conversions — Listar ConversionEvents com filtros
 * POST /api/v1/conversions — Criar ConversionEvent + CX-01
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, okPaginated, notFound, validationError, internalError } from '@/lib/api-auth'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

const ConversionCreateSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['CONVERSATION', 'MEETING', 'PROPOSAL']),
  attribution: z.enum(['FIRST_TOUCH', 'ASSISTED_TOUCH']).default('FIRST_TOUCH'),
  occurredAt: z.coerce.date(),
  notes: z.string().max(500).optional(),
})

const ListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
})

// GET /api/v1/conversions
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const listResult = ListSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    leadId: searchParams.get('leadId'),
    themeId: searchParams.get('themeId'),
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data

  try {
    const where = {
      ...(parsed.leadId ? { leadId: parsed.leadId } : {}),
      ...(parsed.themeId ? { lead: { firstTouchThemeId: parsed.themeId } } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.conversionEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: { lead: { select: { id: true, company: true, firstTouchThemeId: true } } },
      }),
      prisma.conversionEvent.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/conversions
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = ConversionCreateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId } })
    if (!lead) return notFound('Lead não encontrado')

    const conversion = await prisma.conversionEvent.create({
      data: {
        leadId: parsed.data.leadId,
        type: parsed.data.type,
        attribution: parsed.data.attribution,
        occurredAt: parsed.data.occurredAt,
        notes: parsed.data.notes ?? null,
      },
    })

    // CX-01: OBRIGATÓRIO
    await updateThemeConversionScore(lead.firstTouchThemeId)

    // Audit log (COMP-001)
    await auditLog({
      action: 'conversion.created',
      entityType: 'ConversionEvent',
      entityId: conversion.id,
      userId: user!.id,
      leadId: parsed.data.leadId,
      metadata: {
        type: conversion.type,
        themeId: lead.firstTouchThemeId,
      },
    })

    return ok(conversion, 201)
  } catch {
    return internalError()
  }
}
