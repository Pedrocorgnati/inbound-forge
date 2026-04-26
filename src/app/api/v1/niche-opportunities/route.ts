// TASK-11 (CL-249): listagem paginada de NicheOpportunity com filtro por status.

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
    const status = searchParams.get('status') ?? 'NEW'

    const where: Prisma.NicheOpportunityWhereInput = { status }

    const [data, total] = await Promise.all([
      prisma.nicheOpportunity.findMany({
        where,
        orderBy: { potentialScore: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nicheOpportunity.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
