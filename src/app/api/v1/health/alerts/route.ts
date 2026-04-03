import { NextRequest } from 'next/server'
import { requireSession, internalError, okPaginated } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// GET /api/v1/health/alerts — alertas paginados, filtrável por resolved
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const resolvedParam = searchParams.get('resolved')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

    // Default: apenas alertas não resolvidos
    const resolved = resolvedParam === 'true' ? true : resolvedParam === 'false' ? false : false

    const where = { resolved }

    const [items, total] = await Promise.all([
      prisma.alertLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alertLog.count({ where }),
    ])

    // Mapear para o formato AlertLogEntry do frontend
    const mapped = items.map((a) => ({
      id: a.id,
      service: a.type, // AlertLog.type → AlertLogEntry.service
      severity: a.severity,
      message: a.message,
      occurredAt: a.createdAt.toISOString(),
      resolved: a.resolved,
    }))

    return okPaginated(mapped, { page, limit, total })
  } catch {
    return internalError()
  }
}
