import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'
import { ListContentSchema } from '@/schemas/content.schema'
import { buildSearchWhere } from '@/lib/search/text-search'

// GET /api/v1/content
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const { searchParams } = new URL(request.url)
  const listResult = ListContentSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    themeId: searchParams.get('themeId'),
    status: searchParams.get('status'),
    search: searchParams.get('search') ?? undefined,
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data

  try {

    const filters: Record<string, unknown> = {}
    if (parsed.themeId) filters.themeId = parsed.themeId
    if (parsed.status) filters.status = parsed.status
    // TASK-11 ST004 (CL-CS-034): busca em baseTitle + editedText (title base + corpo editado).
    const searchWhere = buildSearchWhere(parsed.search ?? null, ['baseTitle', 'editedText'])
    const where = searchWhere ? { AND: [filters, searchWhere] } : filters

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
