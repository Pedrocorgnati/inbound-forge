// POST /api/workers/[worker]/trigger — trigger manual uniforme (TASK-7 ST003 / CL-206)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireSession, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const WORKERS = ['scraping', 'image', 'video', 'publishing'] as const
type WorkerId = (typeof WORKERS)[number]

const BodySchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
  reason: z.string().trim().max(500).optional(),
})

type Params = { params: Promise<{ worker: string }> }

async function enqueue(worker: WorkerId, correlationId: string, payload: Record<string, unknown>) {
  const baseUrl = process.env.WORKER_BASE_URL ?? 'http://localhost:3001'
  const token = process.env.WORKER_AUTH_TOKEN
  if (!token) {
    throw new Error('WORKER_AUTH_TOKEN nao configurada.')
  }

  const res = await fetch(`${baseUrl}/internal/trigger/${worker}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-correlation-id': correlationId,
    },
    body: JSON.stringify({ correlationId, payload }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    throw new Error(`worker respondeu ${res.status}`)
  }
}

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

  const correlationId = randomUUID()

  try {
    await enqueue(worker as WorkerId, correlationId, parsed.data.payload)
    await auditLog({
      action: 'WORKER_TRIGGER',
      entityType: 'Worker',
      entityId: worker,
      userId: user!.id,
      metadata: {
        correlationId,
        reason: parsed.data.reason,
        payloadKeys: Object.keys(parsed.data.payload),
      },
    })
    return NextResponse.json({ success: true, correlationId })
  } catch (err) {
    console.error('[workers/trigger] falha:', err instanceof Error ? err.message : err)
    return internalError()
  }
}
