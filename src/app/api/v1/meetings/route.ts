import { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireSession, ok, okPaginated, badRequest, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'confirmed', 'cancelled']).default('all'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

const CreateSchema = z.object({
  leadId: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  externalBookingId: z.string().max(255).optional(),
  bookingStatus: z.enum(['confirmed', 'cancelled', 'canceled', 'completed', 'no_show']).default('confirmed'),
  notes: z.string().max(1000).optional(),
})

function normalizeMeetingStatus(status: string | null) {
  const normalized = status?.toLowerCase()
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled'
  if (normalized === 'completed') return 'completed'
  if (normalized === 'no_show' || normalized === 'no-show') return 'no_show'
  return 'confirmed'
}

function calComUrl(externalBookingId: string | null) {
  return externalBookingId ? `https://app.cal.com/bookings/${encodeURIComponent(externalBookingId)}` : null
}

// GET /api/v1/meetings
// Lista reuniões vindas do webhook Cal.com ou registradas manualmente como conversão.
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  })

  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Filtros inválidos'}`)
  }

  const { page, limit, status, from, to } = parsed.data
  if (from && to && new Date(from) > new Date(to)) {
    return badRequest('VAL_001: `from` deve ser anterior ou igual a `to`')
  }

  const where: Prisma.ConversionEventWhereInput = {
    type: { in: ['MEETING', 'CALENDAR_BOOKING'] },
  }

  if (status === 'cancelled') {
    where.bookingStatus = { in: ['cancelled', 'canceled'] }
  } else if (status === 'confirmed') {
    where.OR = [{ bookingStatus: null }, { bookingStatus: { notIn: ['cancelled', 'canceled'] } }]
  }

  if (from || to) {
    where.occurredAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  try {
    const [meetings, total] = await Promise.all([
      prisma.conversionEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              company: true,
              firstTouchTheme: { select: { id: true, title: true, conversionScore: true } },
            },
          },
        },
      }),
      prisma.conversionEvent.count({ where }),
    ])

    const data = meetings.map((meeting) => ({
      id: meeting.id,
      leadId: meeting.leadId,
      leadName: meeting.lead.name ?? 'Lead sem nome',
      company: meeting.lead.company,
      theme: meeting.lead.firstTouchTheme,
      occurredAt: meeting.occurredAt,
      status: normalizeMeetingStatus(meeting.bookingStatus),
      bookingStatus: meeting.bookingStatus,
      externalBookingId: meeting.externalBookingId,
      calComUrl: calComUrl(meeting.externalBookingId),
      notes: meeting.notes,
      type: meeting.type,
    }))

    return okPaginated(data, { page, limit, total })
  } catch (err) {
    console.error('[meetings] GET error:', err)
    return internalError()
  }
}

// POST /api/v1/meetings
// Stub funcional alinhado ao LLD: cria reunião manual quando o webhook não registrou.
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('VAL_001: body JSON obrigatório')
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Dados inválidos'}`)
  }

  try {
    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId }, select: { id: true } })
    if (!lead) return badRequest('VAL_001: leadId inexistente')

    const meeting = await prisma.conversionEvent.create({
      data: {
        leadId: parsed.data.leadId,
        type: 'CALENDAR_BOOKING',
        attribution: 'FIRST_TOUCH',
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        externalBookingId: parsed.data.externalBookingId ?? null,
        bookingStatus: parsed.data.bookingStatus,
        notes: parsed.data.notes ?? null,
      },
    })

    auditLog({
      action: 'meeting.created',
      entityType: 'ConversionEvent',
      entityId: meeting.id,
      userId: user!.id,
      leadId: meeting.leadId,
      metadata: {
        bookingStatus: meeting.bookingStatus,
        externalBookingId: meeting.externalBookingId,
      },
    }).catch(() => {})

    return ok(meeting, 201)
  } catch (err) {
    console.error('[meetings] POST error:', err)
    return internalError()
  }
}
