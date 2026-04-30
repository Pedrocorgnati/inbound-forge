// GET /api/v1/themes
// Módulo: module-7-theme-scoring-engine (TASK-1/ST002)
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'
import { ListThemesSchema } from '@/schemas/theme.schema'

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const { searchParams } = new URL(request.url)
  const listResult = ListThemesSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    isNew: searchParams.get('isNew') ?? undefined,
    minScore: searchParams.get('minScore') ?? undefined,
    painCategory: searchParams.get('painCategory') ?? undefined,
    niche: searchParams.get('niche') ?? undefined,
    scoreMin: searchParams.get('scoreMin') ?? undefined,
    scoreMax: searchParams.get('scoreMax') ?? undefined,
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data
  // TASK-7 ST002 (CL-TH-016): archivedAt eh canonico. Lista esconde arquivados
  // por default; `?includeArchived=true` remove o filtro.
  const includeArchived = searchParams.get('includeArchived') === 'true'

  try {

    const where: Record<string, unknown> = {}
    if (parsed.status) where.status = parsed.status
    if (parsed.isNew !== undefined) where.isNew = parsed.isNew
    if (!includeArchived) where.archivedAt = null

    // TASK-4 CL-197: combinacao AND entre minScore/scoreMin/scoreMax
    const scoreGte = parsed.scoreMin ?? parsed.minScore
    const scoreRange: Record<string, number> = {}
    if (scoreGte !== undefined) scoreRange.gte = scoreGte
    if (parsed.scoreMax !== undefined) scoreRange.lte = parsed.scoreMax
    // MS13-B002: filtros de score na listagem operativa de temas usam o composto.
    if (Object.keys(scoreRange).length > 0) where.priorityScore = scoreRange

    if (parsed.painCategory) {
      where.contentPieces = {
        some: { painCategory: { contains: parsed.painCategory, mode: 'insensitive' } },
      }
    }
    if (parsed.niche) {
      where.nicheOpportunity = {
        OR: [
          { sector: { contains: parsed.niche, mode: 'insensitive' } },
          { painCategory: { contains: parsed.niche, mode: 'insensitive' } },
        ],
      }
    }

    const [data, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        // MS13-B002: ranking operativo de temas usa o composto (priorityScore).
        orderBy: { priorityScore: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          pain: { select: { title: true } },
          nicheOpportunity: { select: { isGeoReady: true } },
        },
        // scoreBreakdown ja vem por padrao em findMany sem select; include nao remove campos top-level
      }),
      prisma.theme.count({ where }),
    ])

    return okPaginated(data, { page: parsed.page, limit: parsed.limit, total })
  } catch {
    return internalError()
  }
}
