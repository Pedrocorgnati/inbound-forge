// TASK-9 ST003 (CL-288): export CSV dos logs com os mesmos filtros da listagem.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireSession, badRequest } from '@/lib/api-auth'

const MAX_ROWS = 10_000

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
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

  const total = await prisma.scrapingAuditLog.count({ where })
  if (total > MAX_ROWS) {
    return badRequest(`Filtros retornam ${total} linhas (> ${MAX_ROWS}). Refine os filtros.`)
  }

  const rows = await prisma.scrapingAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { source: { select: { name: true } } },
  })

  const header = [
    'id',
    'createdAt',
    'sourceId',
    'sourceName',
    'sourceType',
    'sourceUrl',
    'status',
    'textsCollected',
    'textsClassified',
    'errorsCount',
    'durationMs',
    'errorMessage',
  ].join(',')

  const lines = rows.map((r) =>
    [
      escapeCsv(r.id),
      escapeCsv(r.createdAt.toISOString()),
      escapeCsv(r.sourceId),
      escapeCsv(r.source?.name),
      escapeCsv(undefined),
      escapeCsv(r.sourceUrl),
      escapeCsv(r.status),
      escapeCsv(r.textsCollected),
      escapeCsv(r.textsClassified),
      escapeCsv(r.errorsCount),
      escapeCsv(r.durationMs),
      escapeCsv(r.errorMessage),
    ].join(',')
  )

  const csv = [header, ...lines].join('\n')
  const filename = `scraping-audit-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
