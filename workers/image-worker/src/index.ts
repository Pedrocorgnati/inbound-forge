// module-9: Image Worker Entry Point
// IMPORTANTE: loadWorkerEnv() DEVE ser o primeiro import/call (fail-fast antes de qualquer conexão)
// Rastreabilidade: TASK-0 ST005, TASK-1 ST004, FEAT-creative-generation-001

import http from 'http'
import { loadWorkerEnv } from './env'

// ─── FAIL-FAST: validar env antes de qualquer import de cliente ────────────────
const env = loadWorkerEnv()

// Apenas após validação bem-sucedida importar clientes que usam variáveis de ambiente
import('dotenv/config').catch(() => {})

// ─── Health check HTTP server (Railway healthcheckPath="/health") ──────────────
const PORT = Number(process.env.PORT ?? 3001)
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', worker: 'image', ts: new Date().toISOString() }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const { startConsumerLoop } = await import('./consumer')
  const { startHeartbeat } = await import('./health')
  const { getRedisClient } = await import('./redis-client')

  const db     = new PrismaClient()
  const redis  = getRedisClient(env)

  process.stdout.write(JSON.stringify({
    event:     'image_worker_started',
    timestamp: new Date().toISOString(),
    config: {
      timeoutMs:    env.IMAGE_WORKER_TIMEOUT_MS,
      storageBucket: env.SUPABASE_STORAGE_BUCKET,
    },
  }) + '\n')

  // Graceful shutdown
  let heartbeatInterval: NodeJS.Timeout

  process.on('SIGTERM', async () => {
    clearInterval(heartbeatInterval)
    healthServer.close()
    await db.$disconnect()
  })

  // Start health check server
  healthServer.listen(PORT, () => {
    process.stdout.write(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }) + '\n')
  })

  // Start heartbeat e consumer em paralelo
  heartbeatInterval = startHeartbeat(db)

  await startConsumerLoop(redis, db, env)
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ event: 'worker_fatal_error', error: String(err), timestamp: new Date().toISOString() }) + '\n')
  process.exit(1)
})
