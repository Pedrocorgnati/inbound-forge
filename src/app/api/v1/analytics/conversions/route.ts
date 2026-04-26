// GET /api/v1/analytics/conversions
// Intake-Review TASK-13 ST002 (CL-TA-043): filtro combinado periodo + type + lead/theme.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, validationError, internalError } from '@/lib/api-auth'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['CONVERSATION', 'MEETING', 'PROPOSAL', 'CALENDAR_BOOKING']).optional(),
  attribution: z.enum(['FIRST_TOUCH', 'ASSISTED_TOUCH']).optional(),
  leadId: z.string().uuid().optional(),
  themeId: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    attribution: searchParams.get('attribution') ?? undefined,
    leadId: searchParams.get('leadId') ?? undefined,
    themeId: searchParams.get('themeId') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const f = parsed.data

  if (f.from && f.to && new Date(f.from) > new Date(f.to)) {
    return validationError(new Error('`from` deve ser anterior ou igual a `to`'))
  }

  try {
    const where: Record<string, unknown> = {}
    if (f.type) where.type = f.type
    if (f.attribution) where.attribution = f.attribution
    if (f.leadId) where.leadId = f.leadId
    if (f.from || f.to) {
      where.occurredAt = {
        ...(f.from ? { gte: new Date(f.from) } : {}),
        ...(f.to ? { lte: new Date(f.to) } : {}),
      }
    }
    if (f.themeId) {
      where.lead = { firstTouchThemeId: f.themeId }
    }

    const [data, total] = await Promise.all([
      prisma.conversionEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (f.page - 1) * f.limit,
        take: f.limit,
        include: { lead: { select: { id: true, name: true, firstTouchThemeId: true } } },
      }),
      prisma.conversionEvent.count({ where }),
    ])

    return okPaginated(data, { page: f.page, limit: f.limit, total })
  } catch {
    return internalError()
  }
}
