// TASK-13 (CL-289): export LGPD Art. 18 — dados pessoais do operator.
// Rate-limit: 1 request / 24h por operator via AuditLog.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import { buildDataExport } from '@/lib/compliance/export-builder'
import { auditLog } from '@/lib/audit'

const ACTION = 'data_export_requested'
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000

export async function GET(_request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  if (!user?.id) return new Response('unauthorized', { status: 401 })

  const since = new Date(Date.now() - RATE_WINDOW_MS)
  const recent = await prisma.auditLog.findFirst({
    where: { action: ACTION, userId: user.id, createdAt: { gte: since } },
  })
  if (recent) {
    return new Response(
      JSON.stringify({ success: false, error: 'Export já solicitado nas últimas 24h' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await buildDataExport(user.id)

  await auditLog({
    action: ACTION,
    entityType: 'Operator',
    entityId: user.id,
    userId: user.id,
    metadata: { generatedAt: data.generatedAt },
  }).catch(() => undefined)

  const filename = `data-export-${user.id}-${new Date().toISOString().slice(0, 10)}.json`
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
