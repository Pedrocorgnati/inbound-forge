// GET /api/v1/themes
// Módulo: module-7-theme-scoring-engine (TASK-1/ST002)
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError } from '@/lib/api-auth'
import { ListThemesSchema } from '@/schemas/theme.schema'

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const parsed = ListThemesSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      isNew: searchParams.get('isNew'),
      minScore: searchParams.get('minScore'),
    })

    const where: Record<string, unknown> = {}
    if (parsed.status) where.status = parsed.status
    if (parsed.isNew !== undefined) where.isNew = parsed.isNew
    if (parsed.minScore !== undefined) {
      where.conversionScore = { gte: parsed.minScore }
    }

    const [data, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        orderBy: { conversionScore: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          pain: { select: { title: true } },
          nicheOpportunity: { select: { isGeoReady: true } },
        },
      }),
      prisma.theme.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}
