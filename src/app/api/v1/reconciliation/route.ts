import { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireSession, ok, okPaginated, badRequest, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

const QuerySchema = z.object({
  resolved: z.enum(['true', 'false']).optional(),
  status: z.enum(['matched', 'unmatched', 'disputed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const CreateSchema = z.object({
  type: z.enum(['click_without_conversion', 'conversion_without_post']),
  postId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

function resolveStatus(item: { resolved: boolean; resolution: string | null }) {
  const resolution = item.resolution?.toLowerCase() ?? ''
  if (resolution.includes('disput') || resolution.includes('contest')) return 'disputed'
  return item.resolved ? 'matched' : 'unmatched'
}

// GET /api/v1/reconciliation?resolved=false&page=&limit=
// INT-106 | PERF-002: paginação obrigatória
export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    resolved: searchParams.get('resolved') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return badRequest(`VAL_001: ${parsed.error.issues[0]?.message ?? 'Filtros inválidos'}`)
  }

  const { resolved, status, page, limit } = parsed.data

  try {
    const where: Prisma.ReconciliationItemWhereInput =
      resolved !== undefined
        ? { resolved: resolved === 'true' }
        : status === 'matched'
          ? { resolved: true }
          : status === 'unmatched'
            ? { resolved: false }
            : status === 'disputed'
              ? {
                  OR: [
                    { resolution: { contains: 'disput', mode: 'insensitive' } },
                    { resolution: { contains: 'contest', mode: 'insensitive' } },
                  ],
                }
              : {}

    const [items, total] = await Promise.all([
      prisma.reconciliationItem.findMany({
        where,
        orderBy: { weekOf: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              firstTouchTheme: { select: { id: true, title: true, conversionScore: true } },
              conversionEvents: {
                select: { id: true, type: true, occurredAt: true },
                orderBy: { occurredAt: 'desc' },
                take: 3,
              },
            },
          },
        },
      }),
      prisma.reconciliationItem.count({ where }),
    ])

    const data = items.map((item) => {
      const itemStatus = resolveStatus(item)
      return {
        id: item.id,
        type: item.type,
        postId: item.postId,
        leadId: item.leadId,
        weekOf: item.weekOf,
        resolved: item.resolved,
        resolution: item.resolution,
        createdAt: item.createdAt,
        status: itemStatus,
        leadName: item.lead?.name ?? null,
        theme: item.lead?.firstTouchTheme ?? null,
        conversions: item.lead?.conversionEvents ?? [],
        conversionCount: item.lead?.conversionEvents.length ?? 0,
        matchingLabel: item.lead?.firstTouchTheme
          ? `${item.lead.firstTouchTheme.title} -> conversão`
          : 'Tema sem conversão atribuída',
      }
    })

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
