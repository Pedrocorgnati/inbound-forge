/**
 * TASK-4 ST003 (CL-TH-059): lista WorkerJobs para o painel /health/jobs.
 * Filtros: status, type, from, to, page, limit.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, okPaginated, validationError, internalError } from '@/lib/api-auth'

const ListSchema = z.object({
  status: z
    .enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'])
    .optional(),
  type: z.string().trim().min(1).max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = ListSchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const { status, type, from, to, page, limit } = parsed.data

  try {
    const where = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.workerJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workerJob.count({ where }),
    ])

    return okPaginated(items, { page, limit, total })
  } catch {
    return internalError()
  }
}
