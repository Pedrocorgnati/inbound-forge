// TASK-9 (CL-288): listagem paginada de ScrapingAuditLog com filtros.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireSession, okPaginated, internalError } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const status = searchParams.get('status') as 'SUCCESS' | 'PARTIAL' | 'FAILED' | null
    const sourceId = searchParams.get('sourceId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Prisma.ScrapingAuditLogWhereInput = {}
    if (status) where.status = status
    if (sourceId) where.sourceId = sourceId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const [data, total] = await Promise.all([
      prisma.scrapingAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { source: { select: { id: true, name: true } } },
      }),
      prisma.scrapingAuditLog.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
