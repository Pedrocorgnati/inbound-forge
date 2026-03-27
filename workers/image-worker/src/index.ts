// module-9: Image Worker Entry Point
// IMPORTANTE: loadWorkerEnv() DEVE ser o primeiro import/call (fail-fast antes de qualquer conexão)
// Rastreabilidade: TASK-0 ST005, TASK-1 ST004, FEAT-creative-generation-001

import { loadWorkerEnv } from './env'

// ─── FAIL-FAST: validar env antes de qualquer import de cliente ────────────────
const env = loadWorkerEnv()

// Apenas após validação bem-sucedida importar clientes que usam variáveis de ambiente
import('dotenv/config').catch(() => {})

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
    await db.$disconnect()
  })

  // Start heartbeat e consumer em paralelo
  heartbeatInterval = startHeartbeat(db)

  await startConsumerLoop(redis, db, env)
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ event: 'worker_fatal_error', error: String(err), timestamp: new Date().toISOString() }) + '\n')
  process.exit(1)
})
