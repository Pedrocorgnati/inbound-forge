// GET /api/v1/leads/export — CSV export com filtros aplicados (TASK-6 ST002 / CL-142)
// Streaming via ReadableStream para evitar OOM em datasets grandes.
// COMP-001: registra AuditLog LEAD_EXPORT (sem PII no metadata).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const QuerySchema = z.object({
  status: z.enum(['NEW', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'LOST']).optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).optional(),
  channel: z.string().trim().min(1).max(50).optional(),
  themeId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  utmSource: z.string().trim().min(1).max(100).optional(),
})

const COLUMNS = [
  'id',
  'name',
  'company',
  'channel',
  'funnel_stage',
  'status',
  'loss_reason',
  'loss_reason_detail',
  'first_touch_theme',
  'lgpd_consent',
  'created_at',
  'status_updated_at',
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
  const parsed = QuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    funnelStage: searchParams.get('funnelStage') ?? undefined,
    channel: searchParams.get('channel') ?? undefined,
    themeId: searchParams.get('themeId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    utmSource: searchParams.get('utmSource') ?? undefined,
  })
  if (!parsed.success) return validationError(parsed.error)
  const filters = parsed.data

  try {
    const where: Record<string, unknown> = {}
    if (filters.status) where.status = filters.status
    if (filters.funnelStage) where.funnelStage = filters.funnelStage
    if (filters.channel) where.channel = filters.channel
    if (filters.themeId) where.firstTouchThemeId = filters.themeId
    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      }
    }

    const total = await prisma.lead.count({ where })
    const PAGE_SIZE = 500
    const pages = Math.ceil(total / PAGE_SIZE)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(COLUMNS.join(',') + '\n'))

        for (let i = 0; i < pages; i++) {
          const batch = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: i * PAGE_SIZE,
            take: PAGE_SIZE,
            select: {
              id: true,
              name: true,
              company: true,
              channel: true,
              funnelStage: true,
              status: true,
              lossReason: true,
              lossReasonDetail: true,
              lgpdConsent: true,
              createdAt: true,
              statusUpdatedAt: true,
              firstTouchTheme: { select: { title: true } },
            },
          })

          for (const lead of batch) {
            const row = [
              lead.id,
              lead.name ?? '',
              lead.company ?? '',
              lead.channel ?? '',
              lead.funnelStage ?? '',
              lead.status,
              lead.lossReason ?? '',
              lead.lossReasonDetail ?? '',
              lead.firstTouchTheme?.title ?? '',
              lead.lgpdConsent ? 'true' : 'false',
              lead.createdAt.toISOString(),
              lead.statusUpdatedAt?.toISOString() ?? '',
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
      action: 'LEAD_EXPORT',
      entityType: 'Lead',
      entityId: 'bulk',
      userId: user.id,
      metadata: { count: total, filters },
    })

    const filename = `leads-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
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
