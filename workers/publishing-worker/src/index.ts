/**
 * Publishing Worker — Entry Point
 * PÓS-MVP (CL-107): Worker Railway dedicado para publicação de posts agendados.
 * Feature flag: ENABLE_PUBLISHING_WORKER=true para ativar.
 *
 * Rastreabilidade: TASK-7 ST001, CL-107, CL-051
 */

import http from 'http'
import { Redis } from '@upstash/redis'
import { PrismaClient } from '@prisma/client'
import { startConsumerLoop, requestDrain } from './consumer'

// Intake Review TASK-9 ST001 (CL-075): worker passou a rodar por padrao.
// ENABLE_PUBLISHING_WORKER permanece aceito para compat, mas so desliga
// explicitamente quando setado para 'false'.
if (process.env.ENABLE_PUBLISHING_WORKER === 'false') {
  log({ event: 'publishing_worker_disabled', reason: 'flag_false', timestamp: new Date().toISOString() })
  process.exit(0)
}
if (process.env.ENABLE_PUBLISHING_WORKER === 'true') {
  log({ event: 'publishing_worker_flag_deprecated', timestamp: new Date().toISOString() })
}

// ─── Env validation ────────────────────────────────────────────────────────────
const required = ['DATABASE_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
for (const key of required) {
  if (!process.env[key]) {
    process.stderr.write(JSON.stringify({ event: 'env_missing', key, timestamp: new Date().toISOString() }) + '\n')
    process.exit(1)
  }
}

// ─── Health check HTTP server ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3002)
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', worker: 'publishing', ts: new Date().toISOString() }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

async function main() {
  const db = new PrismaClient()
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  log({ event: 'publishing_worker_started', timestamp: new Date().toISOString() })

  // Graceful shutdown (WK-WRK-04): aguarda a publicacao em voo drenar antes do
  // disconnect. requestDrain sinaliza o loop e acorda o sleep de 60s; o job em
  // voo (publishPost) e aguardado pelo proprio while antes de consumerDone resolver.
  let consumerDone: Promise<void> | undefined
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    log({ event: 'sigterm_received', signal, timestamp: new Date().toISOString() })
    requestDrain()
    const forced = setTimeout(() => {
      process.stderr.write(JSON.stringify({ event: 'forced_exit_after_drain_timeout', timestamp: new Date().toISOString() }) + '\n')
      process.exit(1)
    }, 25_000)
    forced.unref()
    try {
      if (consumerDone) await consumerDone
    } finally {
      clearTimeout(forced)
      healthServer.close()
      await db.$disconnect()
      log({ event: 'graceful_shutdown_complete', timestamp: new Date().toISOString() })
      process.exit(0)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  healthServer.listen(PORT, () => {
    log({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() })
  })

  consumerDone = startConsumerLoop(redis, db)
  await consumerDone
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ event: 'fatal_error', error: String(err), timestamp: new Date().toISOString() }) + '\n')
  process.exit(1)
})

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
