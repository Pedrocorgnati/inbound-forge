// TAREFA-014: export CSV da auditoria de scraping com os mesmos filtros da listagem.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import type { Prisma, ScrapingAuditStatus, ScrapingRobotsDecision } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, badRequest, validationError } from '@/lib/api-auth'

const MAX_ROWS = 10_000

const QuerySchema = z.object({
  sourceId: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  decision: z.enum(['allow', 'deny', 'ALLOW', 'DENY']).optional(),
  status: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']).optional(),
  correlationId: z.string().trim().min(1).optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
})

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function parseDateParam(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data invalida: ${value}`)
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999)
  }
  return date
}

function serializeDecision(decision: ScrapingRobotsDecision): 'allow' | 'deny' {
  return decision === 'DENY' ? 'deny' : 'allow'
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return validationError(parsed.error)

  let from: Date | undefined
  let to: Date | undefined
  try {
    from = parseDateParam(parsed.data.from)
    to = parseDateParam(parsed.data.to, true)
  } catch (error) {
    return validationError(error)
  }

  const sourceId = parsed.data.sourceId ?? parsed.data.source
  const robotsDecision = parsed.data.decision
    ? (parsed.data.decision.toUpperCase() as ScrapingRobotsDecision)
    : undefined

  const where: Prisma.ScrapingAuditLogWhereInput = {
    source: { operatorId: user!.id },
    ...(sourceId && { sourceId }),
    ...(robotsDecision && { robotsDecision }),
    ...(parsed.data.status && { status: parsed.data.status as ScrapingAuditStatus }),
    ...(parsed.data.correlationId && { correlationId: parsed.data.correlationId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
  }

  try {
    const total = await prisma.scrapingAuditLog.count({ where })
    if (total > MAX_ROWS) {
      return badRequest(`Filtros retornam ${total} linhas (> ${MAX_ROWS}). Refine os filtros.`)
    }

    const rows = await prisma.scrapingAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { source: { select: { name: true, url: true } } },
    })

    const correlationIds = Array.from(new Set(rows.map((row) => row.correlationId).filter(Boolean)))
    const piiReveals = correlationIds.length
      ? await prisma.pIIRevealAudit.findMany({
          where: { correlationId: { in: correlationIds }, revealedBy: user!.id },
          select: { correlationId: true, leadId: true, revealedBy: true, createdAt: true },
        })
      : []
    const piiByCorrelation = new Map(piiReveals.map((audit) => [audit.correlationId, audit]))

    const header = [
      'id',
      'createdAt',
      'sourceId',
      'sourceName',
      'sourceUrl',
      'robotsDecision',
      'latencyMs',
      'statusCode',
      'correlationId',
      'revealedBy',
      'piiRevealLeadId',
      'piiRevealCreatedAt',
      'ttlExpiresAt',
      'status',
      'textsCollected',
      'textsClassified',
      'errorsCount',
      'errorMessage',
    ].join(',')

    const lines = rows.map((row) => {
      const piiReveal = piiByCorrelation.get(row.correlationId)
      return [
        escapeCsv(row.id),
        escapeCsv(row.createdAt.toISOString()),
        escapeCsv(row.sourceId),
        escapeCsv(row.source?.name),
        escapeCsv(row.sourceUrl),
        escapeCsv(serializeDecision(row.robotsDecision)),
        escapeCsv(row.latencyMs ?? row.durationMs),
        escapeCsv(row.statusCode),
        escapeCsv(row.correlationId),
        escapeCsv(row.revealedBy ?? piiReveal?.revealedBy),
        escapeCsv(piiReveal?.leadId),
        escapeCsv(piiReveal?.createdAt.toISOString()),
        escapeCsv(row.ttlExpiresAt.toISOString()),
        escapeCsv(row.status),
        escapeCsv(row.textsCollected),
        escapeCsv(row.textsClassified),
        escapeCsv(row.errorsCount),
        escapeCsv(row.errorMessage),
      ].join(',')
    })

    const csv = [header, ...lines].join('\n')
    const filename = `scraping-audit-${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const correlationId = randomUUID()
    console.error(`[scraping-audit-export] failed correlation_id=${correlationId}`, error)
    return NextResponse.json(
      {
        success: false,
        code: 'SCRAPING_AUDIT_EXPORT_FAILED',
        error: 'Nao foi possivel exportar a auditoria de scraping.',
        correlation_id: correlationId,
      },
      { status: 500 },
    )
  }
}
