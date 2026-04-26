/**
 * Publishing Worker — Inbound Forge
 * TASK-9 ST001 / CL-155 (pos-MVP)
 *
 * Servico Railway dedicado ao publishing de posts.
 * Loop: dequeue() -> channel.publish() -> ack.
 *
 * PENDENTE (PENDING-ACTIONS):
 * - Configurar servico em Railway (railway.toml / deploy manual)
 * - Instalar variaveis de ambiente isoladas no Railway dashboard
 * - Validar rollback documentado em INFRA.md
 */
import http from 'http'
import { Redis } from '@upstash/redis'
import { PrismaClient } from '@prisma/client'

const POLL_INTERVAL_MS = 30_000
const HEALTH_PORT = Number(process.env.HEALTH_PORT ?? 8080)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const prisma = new PrismaClient()

let lastProcessedAt: string | null = null
let processedCount = 0

async function processNext(): Promise<boolean> {
  const raw = await redis.rpop('worker:publishing:queue').catch(() => null)
  if (!raw) return false

  const job = typeof raw === 'string' ? JSON.parse(raw) : raw as { postId: string; channel: string }

  try {
    // TODO: instanciar channel correto (LinkedIn, Instagram, TikTok, YouTube)
    console.info(`[publishing-worker] Processing job | postId=${job.postId} | channel=${job.channel}`)

    await prisma.publishingQueue.updateMany({
      where: { postId: job.postId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    })

    // TODO: chamar channel adapter correspondente
    // await channelRegistry[job.channel].publish(job)

    await prisma.publishingQueue.updateMany({
      where: { postId: job.postId, status: 'PROCESSING' },
      data: { status: 'DONE' },
    })

    lastProcessedAt = new Date().toISOString()
    processedCount++
    return true
  } catch (err) {
    console.error(`[publishing-worker] Job failed | postId=${job.postId}`, err)
    await prisma.publishingQueue.updateMany({
      where: { postId: job.postId },
      data: { status: 'FAILED' },
    })
    return false
  }
}

async function run() {
  console.info(`[publishing-worker] Starting | poll=${POLL_INTERVAL_MS}ms`)

  // Health check server (TASK-9 ST003)
  const server = http.createServer(async (_req, res) => {
    const depth = await redis.llen('worker:publishing:queue').catch(() => -1)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      queueDepth: depth,
      processedTotal: processedCount,
      lastProcessedAt,
    }))
  })
  server.listen(HEALTH_PORT, () => {
    console.info(`[publishing-worker] Health check em :${HEALTH_PORT}/health`)
  })

  while (true) {
    try {
      const hadJob = await processNext()
      if (!hadJob) await sleep(POLL_INTERVAL_MS)
    } catch (err) {
      console.error('[publishing-worker] Loop error', err)
      await sleep(5_000)
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

run().catch((err) => {
  console.error('[publishing-worker] Fatal error', err)
  process.exit(1)
})
