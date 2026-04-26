// Video Worker Entry Point
// Integração: Short Video Maker MCP (gyoridavid/short-video-maker)
// Pattern: polling Redis queue → create video → poll status → download → upload to Supabase

import http from 'http'
import { loadWorkerEnv } from './env'

// ─── FAIL-FAST: validar env antes de qualquer import de cliente ────────────────
const env = loadWorkerEnv()

import('dotenv/config').catch(() => {})

// ─── Health check HTTP server ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3002)
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', worker: 'video', ts: new Date().toISOString() }))
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

  const db    = new PrismaClient()
  const redis = getRedisClient(env)

  process.stdout.write(JSON.stringify({
    event:     'video_worker_started',
    timestamp: new Date().toISOString(),
    config: {
      timeoutMs:       env.VIDEO_WORKER_TIMEOUT_MS,
      videoMakerUrl:   env.SHORT_VIDEO_MAKER_URL,
      storageBucket:   env.SUPABASE_STORAGE_BUCKET,
    },
  }) + '\n')

  let heartbeatInterval: NodeJS.Timeout

  process.on('SIGTERM', async () => {
    clearInterval(heartbeatInterval)
    healthServer.close()
    await db.$disconnect()
  })

  healthServer.listen(PORT, () => {
    process.stdout.write(JSON.stringify({ event: 'health_server_started', port: PORT, timestamp: new Date().toISOString() }) + '\n')
  })

  heartbeatInterval = startHeartbeat(db)

  await startConsumerLoop(redis, db, env)
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ event: 'worker_fatal_error', error: String(err), timestamp: new Date().toISOString() }) + '\n')
  process.exit(1)
})
