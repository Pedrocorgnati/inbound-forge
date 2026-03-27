/**
 * Heartbeat Redis — Scraping Worker
 * TASK-1 ST002 / CX-05 / module-6-scraping-worker
 *
 * Atualiza WORKER_HEARTBEAT e WorkerHealth no Prisma a cada 30s.
 * SEC-008: logs apenas contêm IDs e timestamps — NUNCA rawText.
 * NOTIF-001: alerta disparado se heartbeat ficar offline > 30min (via status route).
 */
import { Redis } from '@upstash/redis'
import { HEARTBEAT_INTERVAL_MS, MAX_HEARTBEAT_TTL_SECONDS } from './constants'
import { getPrisma } from './db'

const REDIS_KEYS = {
  WORKER_HEARTBEAT: (workerId: string) => `worker:heartbeat:${workerId}`,
  SCRAPING_WORKER_STATUS: 'worker:scraping:status',
} as const

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

export function startHeartbeat(redis: Redis, workerId: string): void {
  if (heartbeatTimer) return // já está rodando

  const beat = async () => {
    const timestamp = new Date().toISOString()
    const key = REDIS_KEYS.WORKER_HEARTBEAT(workerId)

    try {
      // CX-05: atualizar heartbeat Redis com TTL
      await redis.set(key, timestamp, { ex: MAX_HEARTBEAT_TTL_SECONDS })
      await redis.set(REDIS_KEYS.SCRAPING_WORKER_STATUS, JSON.stringify({ workerId, lastHeartbeat: timestamp, status: 'ACTIVE' }), { ex: MAX_HEARTBEAT_TTL_SECONDS })
    } catch (err) {
      // SEC-008: log apenas IDs — sem dados de conteúdo
      console.error(`[Heartbeat] Redis error | workerId=${workerId} | ts=${timestamp}`, err instanceof Error ? err.message : 'unknown')
    }

    // Atualizar WorkerHealth no Prisma (tolerante a falha — não bloqueia o worker)
    try {
      const prisma = getPrisma()
      await prisma.workerHealth.upsert({
        where: { type: 'SCRAPING' },
        update: { lastHeartbeat: new Date(timestamp), status: 'ACTIVE' },
        create: { type: 'SCRAPING', status: 'ACTIVE', lastHeartbeat: new Date(timestamp) },
      })
    } catch (err) {
      // SEC-008: log apenas campo de erro — sem dados de conteúdo
      console.error(`[Heartbeat] DB update error | workerId=${workerId}`, err instanceof Error ? err.message : 'unknown')
      // Não re-lança — heartbeat Redis continua operando
    }
  }

  // Primeiro beat imediato
  void beat()
  heartbeatTimer = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS)

  console.log(`[Heartbeat] Started | workerId=${workerId} | interval=${HEARTBEAT_INTERVAL_MS}ms`)
}

export function stopHeartbeat(redis: Redis, workerId: string): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  // Marcar como IDLE no Prisma ao encerrar graciosamente
  const prisma = getPrisma()
  prisma.workerHealth
    .update({ where: { type: 'SCRAPING' }, data: { status: 'IDLE' } })
    .catch((err: unknown) => {
      console.error(`[Heartbeat] Failed to mark IDLE | workerId=${workerId}`, err instanceof Error ? err.message : 'unknown')
    })

  // Limpar status do Redis
  redis
    .del(REDIS_KEYS.SCRAPING_WORKER_STATUS)
    .catch((err: unknown) => {
      console.error(`[Heartbeat] Failed to clear Redis status | workerId=${workerId}`, err instanceof Error ? err.message : 'unknown')
    })

  console.log(`[Heartbeat] Stopped | workerId=${workerId}`)
}
