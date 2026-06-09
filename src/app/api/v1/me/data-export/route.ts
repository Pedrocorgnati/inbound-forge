/**
 * Rastreabilidade: CL-298, TASK-2 ST002
 * POST: cria pedido de export LGPD async (rate-limit 1/dia)
 * GET:  retorna histórico de exports (max 5) com status
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, internalError, ok } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { redis } from '@/lib/redis'
import { processLgpdExport } from '@/workers/lgpd-export.worker'
import { captureException } from '@/lib/sentry'

const RATE_TTL_SECONDS = 24 * 3600
const MAX_HISTORY = 5

function rateKey(operatorId: string): string {
  return `lgpd:export:${operatorId}`
}

export async function POST() {
  const { user, response } = await requireSession()
  if (response) return response
  const operatorId = user!.id

  const existing = await redis.get<string>(rateKey(operatorId))
  if (existing) {
    const ttl = await redis.ttl(rateKey(operatorId))
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: ttl > 0 ? ttl : RATE_TTL_SECONDS },
      { status: 429, headers: { 'Retry-After': String(ttl > 0 ? ttl : RATE_TTL_SECONDS) } },
    )
  }

  try {
    const request = await prisma.dataExportRequest.create({
      data: { operatorId, status: 'pending' },
    })

    await redis.set(rateKey(operatorId), request.id, { ex: RATE_TTL_SECONDS })

    await auditLog({
      action: AUDIT_ACTIONS.USER_DATA_EXPORT,
      entityType: 'DataExportRequest',
      entityId: request.id,
      userId: operatorId,
      metadata: { requestId: request.id },
    })

    // CP-COMP-03: processLgpdExport nao tinha caller -> o pedido ficava
    // eternamente "pending" e a UI prometia um email que nunca chegava. Sem
    // infra de fila dedicada (single-operador, volume baixo), processamos inline:
    // o worker resolve o status para `ready` (signed URL 24h) ou `failed`.
    try {
      await processLgpdExport(request.id)
    } catch (err) {
      captureException(err, { scope: 'lgpd.data-export', requestId: request.id })
    }

    const finalReq = await prisma.dataExportRequest.findUnique({
      where: { id: request.id },
      select: { id: true, status: true, fileUrl: true, expiresAt: true },
    })

    return ok({
      requestId: request.id,
      status: finalReq?.status ?? 'pending',
      fileUrl: finalReq?.fileUrl ?? null,
      expiresAt: finalReq?.expiresAt ?? null,
    })
  } catch {
    return internalError()
  }
}

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  const operatorId = user!.id

  try {
    const requests = await prisma.dataExportRequest.findMany({
      where: { operatorId },
      orderBy: { requestedAt: 'desc' },
      take: MAX_HISTORY,
      select: {
        id: true,
        status: true,
        fileUrl: true,
        expiresAt: true,
        requestedAt: true,
        completedAt: true,
      },
    })

    const now = new Date()
    const mapped = requests.map((r) => ({
      ...r,
      isExpired: r.expiresAt ? r.expiresAt < now : false,
      fileUrl: r.expiresAt && r.expiresAt < now ? null : r.fileUrl,
    }))

    return ok({ requests: mapped })
  } catch {
    return internalError()
  }
}
