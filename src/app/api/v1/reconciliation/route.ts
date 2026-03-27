import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, okPaginated, badRequest, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const CreateSchema = z.object({
  type: z.enum(['click_without_conversion', 'conversion_without_post']),
  postId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

// GET /api/v1/reconciliation?resolved=false&page=&limit=
// INT-106 | PERF-002: paginação obrigatória
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const resolvedParam = searchParams.get('resolved')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

  try {
    const where = resolvedParam !== null ? { resolved: resolvedParam === 'true' } : {}
    const [data, total] = await Promise.all([
      prisma.reconciliationItem.findMany({
        where,
        orderBy: { weekOf: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reconciliationItem.count({ where }),
    ])

    return okPaginated(data, { page, limit, total })
  } catch {
    return internalError()
  }
}

// POST /api/v1/reconciliation — Criação manual de item
// INT-106 | COMP-001: auditLog obrigatório
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown = {}
  try { body = await request.json() } catch { /* body opcional */ }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Dados inválidos'}`)
  }

  try {
    const item = await prisma.reconciliationItem.create({
      data: {
        type: parsed.data.type,
        postId: parsed.data.postId ?? null,
        leadId: parsed.data.leadId ?? null,
        weekOf: new Date(),
        resolved: false,
        resolution: parsed.data.notes ?? null,
      },
    })

    auditLog({
      action: 'reconciliation.created',
      entityType: 'ReconciliationItem',
      entityId: item.id,
      userId: user!.id,
      metadata: { type: item.type },
    }).catch(() => {})

    return ok(item, 201)
  } catch {
    return internalError()
  }
}
