/**
 * GET /api/worker-health — Status do image worker
 *
 * Módulo: module-9-image-worker (TASK-1/ST004)
 * Rastreabilidade: CX-05, INT-084, FEAT-creative-generation-004
 * Error Catalog: IMAGE_052 (worker DOWN — sem heartbeat > 60s)
 * Notificações: NOTIF-001 (worker sem heartbeat > 30min → disparar alerta)
 */

import { NextResponse } from 'next/server'
import { requireSession, ok } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const WORKER_DOWN_THRESHOLD_MS    = 60_000   // 60s
const WORKER_ALERT_THRESHOLD_MS   = 30 * 60 * 1_000 // 30min (NOTIF-001)

export async function GET() {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const workerHealth = await prisma.workerHealth.findUnique({
    where: { type: 'IMAGE' },
    select: {
      status:        true,
      lastHeartbeat: true,
      metadata:      true,
    },
  })

  if (!workerHealth) {
    return NextResponse.json(
      { status: 'DOWN', lastBeatAt: null, code: 'IMAGE_052' },
      { status: 200 }
    )
  }

  const sinceMs   = Date.now() - workerHealth.lastHeartbeat.getTime()
  const isDown    = sinceMs > WORKER_DOWN_THRESHOLD_MS
  const isAlert   = sinceMs > WORKER_ALERT_THRESHOLD_MS // NOTIF-001

  if (isDown) {
    // NOTIF-001: log para posterior disparo de notificação
    if (isAlert) {
      console.warn(JSON.stringify({
        event:      'worker_down_alert',
        code:       'NOTIF-001',
        workerType: 'image_worker',
        lastBeatAt: workerHealth.lastHeartbeat.toISOString(),
        sinceMs,
      }))
    }

    return NextResponse.json(
      {
        status:    'DOWN',
        lastBeatAt: workerHealth.lastHeartbeat.toISOString(),
        code:      'IMAGE_052',
        sinceMs,
      },
      { status: 200 }
    )
  }

  return ok({
    status:    'HEALTHY',
    lastBeatAt: workerHealth.lastHeartbeat.toISOString(),
    workerType: 'image_worker',
    metadata:  workerHealth.metadata,
  })
}
