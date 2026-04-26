// POST /api/workers/[worker]/restart — dispara redeploy via Railway (TASK-7 ST002 / CL-253)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  requireSession,
  validationError,
  internalError,
} from '@/lib/api-auth'
import {
  restartWorker,
  RailwayConfigError,
  RailwayRateLimitError,
  RailwayUnavailableError,
  type WorkerId,
} from '@/lib/services/railway.service'
import { auditLog } from '@/lib/audit'

const WORKERS = ['scraping', 'image', 'video', 'publishing'] as const

const BodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

type Params = { params: Promise<{ worker: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { worker } = await params
  if (!WORKERS.includes(worker as WorkerId)) {
    return NextResponse.json(
      { success: false, code: 'WORKER_UNKNOWN', message: `Worker "${worker}" desconhecido.` },
      { status: 400 },
    )
  }

  let body: unknown = {}
  try { body = await request.json() } catch { /* opcional */ }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await restartWorker(worker as WorkerId)
    await auditLog({
      action: 'WORKER_RESTART',
      entityType: 'Worker',
      entityId: worker,
      userId: user!.id,
      metadata: { reason: parsed.data.reason, serviceId: result.serviceId },
    })
    return NextResponse.json({ success: true, serviceId: result.serviceId })
  } catch (err) {
    if (err instanceof RailwayRateLimitError) {
      return NextResponse.json(
        { success: false, code: 'RATE_LIMITED', message: err.message, retryAfterMs: err.retryAfterMs },
        { status: 429 },
      )
    }
    if (err instanceof RailwayConfigError) {
      return NextResponse.json(
        { success: false, code: 'RAILWAY_CONFIG', message: err.message },
        { status: 500 },
      )
    }
    if (err instanceof RailwayUnavailableError) {
      return NextResponse.json(
        { success: false, code: 'RAILWAY_UNAVAILABLE', message: err.message },
        { status: 503 },
      )
    }
    return internalError()
  }
}
