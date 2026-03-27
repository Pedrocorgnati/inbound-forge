/**
 * Entry Point — Scraping Worker Railway
 * TASK-1 / module-6-scraping-worker
 *
 * Inicializa: heartbeat Redis, cron scheduler, BullMQ consumer.
 * Graceful shutdown em SIGTERM/SIGINT.
 * SEC-008: logs sem rawText — apenas IDs e status.
 */
import { Redis } from '@upstash/redis'
import { startHeartbeat, stopHeartbeat } from './heartbeat'
import { startCron, stopCron } from './cron'
import { startWorker, stopWorker } from './worker'
import { closeQueue } from './queue'
import { disconnectPrisma } from './db'
import { startCleanupCron, stopCleanupCron } from './raw-text-cleanup'
import { WORKER_ID } from './constants'

// Health check HTTP server (Railway healthcheckPath="/health")
import http from 'http'

const PORT = Number(process.env.PORT ?? 3001)

const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', workerId: WORKER_ID, ts: new Date().toISOString() }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

async function main() {
  console.info(`[Main] Starting scraping worker | workerId=${WORKER_ID}`)

  const redis = getRedis()

  // 1. Heartbeat Redis (CX-05)
  startHeartbeat(redis, WORKER_ID)

  // 2. Cron scheduler
  startCron()

  // 2b. Cleanup cron (COMP-006: rawText nullification a cada 15min)
  startCleanupCron()

  // 3. BullMQ consumer
  startWorker()

  // 4. Health check server
  server.listen(PORT, () => {
    console.info(`[Main] Health check server listening on port ${PORT}`)
  })

  console.info(`[Main] Scraping worker ready | workerId=${WORKER_ID}`)
}

async function shutdown(signal: string) {
  console.info(`[Main] ${signal} received — initiating graceful shutdown | workerId=${WORKER_ID}`)

  const redis = getRedis()

  // Parar em ordem: cron → worker (aguarda job atual) → heartbeat → queue → prisma
  stopCron()
  stopCleanupCron()
  await stopWorker()
  stopHeartbeat(redis, WORKER_ID)
  await closeQueue()
  await disconnectPrisma()

  server.close(() => {
    console.info(`[Main] HTTP server closed | workerId=${WORKER_ID}`)
    process.exit(0)
  })

  // Forçar saída após 10s se o server não fechar
  setTimeout(() => {
    console.error('[Main] Forced exit after graceful shutdown timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

void main().catch((err) => {
  console.error('[Main] Fatal error during startup', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})
