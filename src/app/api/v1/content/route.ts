import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError } from '@/lib/api-auth'
import { ListContentSchema } from '@/schemas/content.schema'

// GET /api/v1/content
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const parsed = ListContentSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      themeId: searchParams.get('themeId'),
      status: searchParams.get('status'),
    })

    const where: Record<string, unknown> = {}
    if (parsed.themeId) where.themeId = parsed.themeId
    if (parsed.status) where.status = parsed.status

    const [data, total] = await Promise.all([
      prisma.contentPiece.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
      }),
      prisma.contentPiece.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}
