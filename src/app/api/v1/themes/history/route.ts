// GET /api/v1/themes/history
// Intake-Review TASK-3 ST004 (CL-198): historico consolidado publicados/editados/rejeitados.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'
import { THEME_STATUS } from '@/constants/status'

const QuerySchema = z.object({
  status: z
    .enum([THEME_STATUS.ACTIVE, THEME_STATUS.DEPRIORITIZED, THEME_STATUS.REJECTED])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  channel: z.string().trim().min(1).max(32).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    channel: searchParams.get('channel') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { status, from, to, channel, page, limit } = parsed.data

  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (from || to) {
      where.updatedAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }
    if (channel) {
      where.contentPieces = { some: { recommendedChannel: channel } }
    }

    const [rows, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          status: true,
          conversionScore: true,
          updatedAt: true,
          rejectedAt: true,
          rejectionReason: true,
          contentPieces: {
            select: { id: true, recommendedChannel: true, status: true },
            take: 5,
          },
        },
      }),
      prisma.theme.count({ where }),
    ])

    const data = rows.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      score: t.conversionScore,
      lastAction: t.rejectedAt ?? t.updatedAt,
      conversions: t.contentPieces.length,
      rejectionReason: t.rejectionReason,
      channels: Array.from(new Set(t.contentPieces.map((c) => c.recommendedChannel))),
    }))

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
