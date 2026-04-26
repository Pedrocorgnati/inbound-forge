// GET /api/v1/images — lista paginada com filtros (status, contentPieceId).
// Intake-Review TASK-12 ST005 / R2 (consumido por DLQPanel e admin UIs).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, validationError, internalError } from '@/lib/api-auth'

const STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'] as const

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUSES).optional(),
  contentPieceId: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    contentPieceId: searchParams.get('contentPieceId') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { page, limit, status, contentPieceId } = parsed.data

  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (contentPieceId) where.contentPieceId = contentPieceId

    const [data, total] = await Promise.all([
      prisma.imageJob.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.imageJob.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}
