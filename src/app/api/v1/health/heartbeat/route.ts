import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkerToken } from '@/lib/api-auth'
import { HeartbeatSchema } from '@/schemas/health.schema'
import { sendHealthDegradedEmail } from '@/lib/notifications/health-degraded.email'

export const runtime = 'nodejs'

// POST /api/v1/health/heartbeat — apenas workers (Bearer token)
export async function POST(request: NextRequest) {
  if (!requireWorkerToken(request)) {
    return NextResponse.json({ success: false, error: 'Token de worker inválido' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const parsed = HeartbeatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Payload inválido', details: parsed.error.errors }, { status: 422 })
  }

  const { type, status, errorMessage } = parsed.data

  await prisma.workerHealth.upsert({
    where: { type },
    update: { status, lastHeartbeat: new Date(), errorMessage: errorMessage ?? null },
    create: { type, status, lastHeartbeat: new Date(), errorMessage: errorMessage ?? null },
  })

  // TASK-9/ST002 F-026: email assíncrono quando worker em ERROR (catch silencioso)
  if (status === 'ERROR') {
    void sendHealthDegradedEmail({
      workerType: type,
      status,
      lastHeartbeat: new Date(),
      errorMessage: errorMessage ?? null,
    }).catch(() => void 0)
  }

  return NextResponse.json({ success: true, message: 'Heartbeat registrado' })
}
