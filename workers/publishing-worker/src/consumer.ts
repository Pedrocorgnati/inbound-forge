/**
 * Publishing Worker Consumer Loop
 * PÓS-MVP (CL-051): polling da fila Redis para posts agendados.
 * Rastreabilidade: TASK-7 ST001, CL-051
 */

import type { Redis } from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'
import { publishPost } from './publisher'
import { assertChannelLocale, ChannelLocaleGateError } from './channel-locale-gate'
import { reapStalledPublishing } from './reaper'

const POLLING_INTERVAL_MS = 60_000 // 1 min — posts agendados não precisam de polling rápido
const HEARTBEAT_INTERVAL_MS = 5 * 60_000 // 5 min

let isShuttingDown = false
// WK-WRK-04: o index.ts e o unico dono do SIGTERM. requestDrain sinaliza parada e
// acorda o sleep de 60s (gargalo do drain, nao-interrompivel antes) de imediato.
let wakeFromSleep: (() => void) | null = null

export function requestDrain(): void {
  isShuttingDown = true
  if (wakeFromSleep) wakeFromSleep()
}

export async function startConsumerLoop(redis: Redis, db: PrismaClient): Promise<void> {

  // Heartbeat via DB
  const heartbeat = setInterval(async () => {
    try {
      await db.workerHealth.upsert({
        where: { type: 'PUBLISHING' },
        create: { type: 'PUBLISHING', status: 'ACTIVE', lastHeartbeat: new Date() },
        update: { status: 'ACTIVE', lastHeartbeat: new Date() },
      })
    } catch { /* non-blocking */ }
  }, HEARTBEAT_INTERVAL_MS)

  log({ event: 'consumer_loop_started', timestamp: new Date().toISOString() })

  while (!isShuttingDown) {
    // WK-WRK-03: antes de processar a fila, recuperar entradas presas em
    // PROCESSING (worker morto no meio de uma publicacao). Reusa o tick de 60s.
    try {
      await reapStalledPublishing(db)
    } catch (err) {
      log({ event: 'reaper_error', error: String(err), timestamp: new Date().toISOString() })
    }
    try {
      await processDuePosts(redis, db)
    } catch (err) {
      log({ event: 'consumer_error', error: String(err), timestamp: new Date().toISOString() })
    }
    if (isShuttingDown) break
    await sleep(POLLING_INTERVAL_MS)
  }

  clearInterval(heartbeat)
  log({ event: 'consumer_loop_stopped', timestamp: new Date().toISOString() })
}

async function processDuePosts(redis: Redis, db: PrismaClient): Promise<void> {
  // Buscar posts com scheduledAt <= now e status SCHEDULED
  // Intake Review TASK-4 ST001: PAUSED e ignorado automaticamente ao filtrar status=PENDING.
  const now = new Date()
  const duePosts = await db.publishingQueue.findMany({
    where: {
      scheduledAt: { lte: now },
      status: 'PENDING',
    },
    include: {
      post: {
        select: {
          id: true,
          channel: true,
          status: true,
        },
      },
    },
    take: 10,
  })

  if (duePosts.length === 0) return

  log({ event: 'due_posts_found', count: duePosts.length, timestamp: new Date().toISOString() })

  for (const queued of duePosts) {
    if (isShuttingDown) break
    // Intake Review TASK-9 ST005 (CL-167) — gate canal x locale.
    // Sem locale por Post ainda (ContentPiece nao tem locale), assumimos pt-BR como default.
    // Quando locale por Post existir, trocar o 'pt-BR' pelo valor real.
    const assumedLocale = 'pt-BR'
    try {
      assertChannelLocale(queued.post.channel, assumedLocale)
    } catch (err) {
      if (err instanceof ChannelLocaleGateError) {
        log({ event: 'channel_locale_gate_skip', postId: queued.postId, channel: queued.post.channel, locale: assumedLocale, timestamp: new Date().toISOString() })
        await db.publishingQueue.update({ where: { id: queued.id }, data: { status: 'CANCELLED' } })
        continue
      }
      throw err
    }
    await publishPost(queued.postId, queued.post.channel, db, redis)
  }
}

// WK-WRK-04: sleep interrompivel — requestDrain() resolve imediatamente no SIGTERM.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { wakeFromSleep = null; resolve() }, ms)
    wakeFromSleep = () => { clearTimeout(timer); wakeFromSleep = null; resolve() }
  })
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
