// GET /api/v1/themes/export — CSV export com filtros aplicados
// Intake-Review TASK-8 ST001 (CL-TH-018): streaming CSV de Themes.
// Pattern identico a /leads/export (cursor-based, ReadableStream).

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { ListThemesSchema } from '@/schemas/theme.schema'

const COLUMNS = [
  'id',
  'title',
  'opportunity_score',
  'conversion_score',
  'status',
  'is_new',
  'pain_category',
  'niche',
  'created_at',
  'last_published_at',
] as const

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

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
  const filters = listResult.data
  const includeArchived = searchParams.get('includeArchived') === 'true'

  try {
    const where: Record<string, unknown> = {}
    if (filters.status) where.status = filters.status
    if (filters.isNew !== undefined) where.isNew = filters.isNew
    if (!includeArchived) where.archivedAt = null

    const scoreGte = filters.scoreMin ?? filters.minScore
    const scoreRange: Record<string, number> = {}
    if (scoreGte !== undefined) scoreRange.gte = scoreGte
    if (filters.scoreMax !== undefined) scoreRange.lte = filters.scoreMax
    // MS13-B002: filtros do export operativo de temas usam o composto.
    if (Object.keys(scoreRange).length > 0) where.priorityScore = scoreRange

    if (filters.painCategory) {
      where.nicheOpportunity = {
        painCategory: { contains: filters.painCategory, mode: 'insensitive' },
      }
    }
    if (filters.niche) {
      where.nicheOpportunity = {
        ...(typeof where.nicheOpportunity === 'object' && where.nicheOpportunity !== null
          ? (where.nicheOpportunity as Record<string, unknown>)
          : {}),
        sector: { contains: filters.niche, mode: 'insensitive' },
      }
    }

    const total = await prisma.theme.count({ where })
    const PAGE_SIZE = 500
    const pages = Math.ceil(total / PAGE_SIZE)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        // UTF-8 BOM para Excel abrir corretamente com acentos
        controller.enqueue(encoder.encode('﻿'))
        controller.enqueue(encoder.encode(COLUMNS.join(',') + '\n'))

        for (let i = 0; i < pages; i++) {
          const batch = await prisma.theme.findMany({
            where,
            // MS13-B002: export operativo ordena por composto (priorityScore).
            orderBy: { priorityScore: 'desc' },
            skip: i * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
              id: true,
              title: true,
              opportunityScore: true,
              conversionScore: true,
              status: true,
              isNew: true,
              createdAt: true,
              lastPublishedAt: true,
              nicheOpportunity: {
                select: { sector: true, painCategory: true },
              },
            },
          })

          for (const theme of batch) {
            const row = [
              theme.id,
              theme.title,
              theme.opportunityScore,
              theme.conversionScore,
              theme.status,
              theme.isNew ? 'true' : 'false',
              theme.nicheOpportunity?.painCategory ?? '',
              theme.nicheOpportunity?.sector ?? '',
              theme.createdAt.toISOString(),
              theme.lastPublishedAt?.toISOString() ?? '',
            ]
              .map(escapeCsv)
              .join(',')
            controller.enqueue(encoder.encode(row + '\n'))
          }
        }

        controller.close()
      },
    })

    void auditLog({
      action: 'THEMES_EXPORT',
      entityType: 'Theme',
      entityId: 'bulk',
      userId: user.id,
      metadata: { count: total, filters, includeArchived },
    })

    const filename = `themes-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return internalError()
  }
}
