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
  const { startReaper } = await import('./reaper')
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

  // Graceful shutdown (WK-WRK-04): o index e o unico dono do encerramento.
  // Aguarda o job em voo drenar (consumerDone) antes de db.$disconnect, com
  // rede de seguranca para nao travar alem do grace do Railway.
  let heartbeatInterval: NodeJS.Timeout
  let reaperInterval: NodeJS.Timeout
  let consumerDone: Promise<void> | undefined
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    process.stdout.write(JSON.stringify({ event: 'sigterm_received', signal, timestamp: new Date().toISOString() }) + '\n')
    const forced = setTimeout(() => {
      process.stderr.write(JSON.stringify({ event: 'forced_exit_after_drain_timeout', timestamp: new Date().toISOString() }) + '\n')
      process.exit(1)
    }, 25_000)
    forced.unref()
    try {
      // O consumer ja setou isShuttingDown via registerSigtermHandler; aqui apenas
      // aguardamos o loop drenar o job em voo e retornar.
      if (consumerDone) await consumerDone
    } finally {
      clearInterval(heartbeatInterval)
      clearInterval(reaperInterval)
      clearTimeout(forced)
      healthServer.close()
      await db.$disconnect()
      process.stdout.write(JSON.stringify({ event: 'graceful_shutdown_complete', timestamp: new Date().toISOString() }) + '\n')
      process.exit(0)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  // Start health check server
  healthServer.listen(PORT, () => {
    process.stdout.write(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }) + '\n')
  })

  // Start heartbeat, reaper e consumer em paralelo
  heartbeatInterval = startHeartbeat(db)
  reaperInterval = startReaper(db, redis)

  consumerDone = startConsumerLoop(redis, db, env)
  await consumerDone
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ event: 'worker_fatal_error', error: String(err), timestamp: new Date().toISOString() }) + '\n')
  process.exit(1)
})
