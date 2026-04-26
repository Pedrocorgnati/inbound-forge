// GET /api/v1/content/rejections/aggregate
// Intake-Review TASK-13 ST001 (CL-CS-037): agregacao por reason para feedback loop.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

const QuerySchema = z.object({
  groupBy: z.enum(['reason', 'angle']).default('reason'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    groupBy: searchParams.get('groupBy') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { groupBy, from, to, limit } = parsed.data

  if (from && to && new Date(from) > new Date(to)) {
    return validationError(new Error('`from` deve ser anterior ou igual a `to`'))
  }

  try {
    const where: Record<string, unknown> = {}
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const grouped = await prisma.contentRejection.groupBy({
      by: [groupBy],
      where,
      _count: { _all: true },
      _max: { createdAt: true },
    })

    const result = grouped
      .map((g) => ({
        [groupBy]: (g as Record<string, unknown>)[groupBy] ?? null,
        count: g._count._all,
        lastAt: g._max.createdAt?.toISOString() ?? null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return ok(result)
  } catch {
    return internalError()
  }
}
