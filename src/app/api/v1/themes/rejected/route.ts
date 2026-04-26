// GET /api/v1/themes/rejected — historico de temas REJEITADOS (TASK-5 ST002)
// Filtros: ?reason=<substring>&from=<ISO>&to=<ISO>&page=1&limit=20

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'

const QuerySchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    reason: searchParams.get('reason') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { reason, from, to, page, limit } = parsed.data

  try {
    const where: Record<string, unknown> = { status: 'REJECTED' }
    if (reason) where.rejectionReason = { contains: reason, mode: 'insensitive' }
    if (from || to) {
      where.rejectedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [data, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        orderBy: { rejectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          rejectionReason: true,
          rejectedAt: true,
          rejectedBy: true,
          conversionScore: true,
          pain: { select: { title: true } },
        },
      }),
      prisma.theme.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
