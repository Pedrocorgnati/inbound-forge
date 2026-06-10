// GET /api/v1/themes
// Módulo: module-7-theme-scoring-engine (TASK-1/ST002)
import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, internalError, validationError } from '@/lib/api-auth'
import { ListThemesSchema } from '@/schemas/theme.schema'
import { THEME_STATUS } from '@/constants/status'

function endOfDay(date: string) {
  const d = new Date(`${date}T23:59:59.999Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfDay(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function applyTab(where: Prisma.ThemeWhereInput, tab: string) {
  if (tab === 'pending_approval') {
    where.status = THEME_STATUS.ACTIVE
    where.isNew = true
    where.archivedAt = null
    return
  }
  if (tab === 'approved') {
    where.status = THEME_STATUS.ACTIVE
    where.isNew = false
    where.archivedAt = null
    return
  }
  if (tab === 'rejected') {
    where.status = THEME_STATUS.REJECTED
    return
  }
  if (tab === 'archived') {
    where.archivedAt = { not: null }
  }
}

function applySourceFilter(where: Prisma.ThemeWhereInput, source: string) {
  if (source === 'manual') {
    where.createdBy = { contains: 'manual', mode: 'insensitive' }
    return
  }
  if (source === 'rss') {
    where.OR = [
      { createdBy: { contains: 'rss', mode: 'insensitive' } },
      { createdBy: { contains: 'feed', mode: 'insensitive' } },
    ]
    return
  }
  where.OR = [
    { createdBy: null },
    { createdBy: { contains: 'scrap', mode: 'insensitive' } },
    { createdBy: { contains: 'crawler', mode: 'insensitive' } },
  ]
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para parâmetros inválidos
  const { searchParams } = new URL(request.url)
  const listResult = ListThemesSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    tab: searchParams.get('tab') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    isNew: searchParams.get('isNew') ?? undefined,
    minScore: searchParams.get('minScore') ?? undefined,
    painCategory: searchParams.get('painCategory') ?? undefined,
    niche: searchParams.get('niche') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    scoreMin: searchParams.get('scoreMin') ?? undefined,
    scoreMax: searchParams.get('scoreMax') ?? undefined,
  })
  if (!listResult.success) return validationError(listResult.error)
  const parsed = listResult.data
  // TASK-7 ST002 (CL-TH-016): archivedAt eh canonico. Lista esconde arquivados
  // por default; `?includeArchived=true` remove o filtro.
  const includeArchived = searchParams.get('includeArchived') === 'true'

  try {

    const where: Prisma.ThemeWhereInput = {}
    applyTab(where, parsed.tab)
    if (parsed.status) where.status = parsed.status
    if (parsed.isNew !== undefined) where.isNew = parsed.isNew
    if (!includeArchived && parsed.tab !== 'all' && parsed.tab !== 'rejected' && parsed.tab !== 'archived') {
      where.archivedAt = null
    }

    // TASK-4 CL-197: combinacao AND entre minScore/scoreMin/scoreMax
    const scoreGte = parsed.scoreMin ?? parsed.minScore
    const scoreRange: Prisma.IntFilter = {}
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
    if (parsed.source) applySourceFilter(where, parsed.source)
    const createdAtRange: Prisma.DateTimeFilter = {}
    if (parsed.dateFrom) {
      const from = startOfDay(parsed.dateFrom)
      if (!from) return validationError(new Error('dateFrom inválido'))
      createdAtRange.gte = from
    }
    if (parsed.dateTo) {
      const to = endOfDay(parsed.dateTo)
      if (!to) return validationError(new Error('dateTo inválido'))
      createdAtRange.lte = to
    }
    if (Object.keys(createdAtRange).length > 0) where.createdAt = createdAtRange

    const [data, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        // MS13-B002: ranking operativo de temas usa o composto (priorityScore).
        orderBy: { priorityScore: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        include: {
          pain: { select: { title: true } },
          nicheOpportunity: { select: { isGeoReady: true, sector: true, painCategory: true } },
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
