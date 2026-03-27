/**
 * GET /api/workers/scraping/status
 * TASK-1 ST004 + ST002b / module-6-scraping-worker
 *
 * Retorna status atual do worker de scraping:
 *   - WorkerHealth do DB (lastHeartbeat, status)
 *   - isOnline: lastHeartbeat > now - 2min
 *   - neverOnline: lastHeartbeat é null
 *
 * Também verifica se o worker está offline > 30min e cria AlertLog (NOTIF-001).
 * AUTH_001: exige JWT via Supabase session.
 * SEC-008: sem dados de conteúdo nos logs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000       // 2 minutos
const OFFLINE_ALERT_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutos

export async function GET(request: NextRequest) {
  // AUTH_001: exigir sessão ativa
  const { response: authError } = await requireSession()
  if (authError) return authError

  try {
    const worker = await prisma.workerHealth.findUnique({
      where: { type: 'SCRAPING' },
      select: { status: true, lastHeartbeat: true, updatedAt: true },
    })

    if (!worker) {
      return ok({
        status: 'IDLE',
        lastHeartbeat: null,
        isOnline: false,
        neverOnline: true,
      })
    }

    const now = Date.now()
    const lastHeartbeatMs = worker.lastHeartbeat ? worker.lastHeartbeat.getTime() : null
    const isOnline = lastHeartbeatMs !== null && now - lastHeartbeatMs < ONLINE_THRESHOLD_MS
    const neverOnline = lastHeartbeatMs === null

    // NOTIF-001 / ST002b: criar AlertLog se offline > 30min
    if (!isOnline && !neverOnline && lastHeartbeatMs !== null) {
      const offlineMs = now - lastHeartbeatMs
      if (offlineMs > OFFLINE_ALERT_THRESHOLD_MS) {
        await createWorkerOfflineAlert(offlineMs).catch((err: unknown) => {
          console.error('[Status] Failed to create offline alert', err instanceof Error ? err.message : 'unknown')
        })
      }
    }

    // Se o worker voltou online, resolver alertas abertos
    if (isOnline) {
      await resolveOpenAlerts().catch(() => {})
    }

    return ok({
      status: worker.status,
      lastHeartbeat: worker.lastHeartbeat?.toISOString() ?? null,
      isOnline,
      neverOnline,
    })
  } catch (err) {
    console.error('[Status] Error fetching worker status', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

const ALERT_TYPE = 'worker_down:SCRAPING'

async function createWorkerOfflineAlert(offlineMs: number): Promise<void> {
  // Idempotência: verificar se já há alerta aberto
  const existing = await prisma.alertLog.findFirst({
    where: { type: ALERT_TYPE, resolved: false },
  })

  if (existing) return // Alerta já existe — não duplicar

  const offlineMinutes = Math.round(offlineMs / 60_000)

  await prisma.alertLog.create({
    data: {
      type: ALERT_TYPE,
      severity: 'ERROR',
      message: `Worker SCRAPING não respondeu nos últimos ${offlineMinutes} minutos. Pipeline pausado.`,
      resolved: false,
    },
  })

  console.warn(`[Status] Worker offline alert created | offlineMinutes=${offlineMinutes}`)
}

async function resolveOpenAlerts(): Promise<void> {
  await prisma.alertLog.updateMany({
    where: { type: ALERT_TYPE, resolved: false },
    data: { resolved: true, resolvedAt: new Date() },
  })
}
