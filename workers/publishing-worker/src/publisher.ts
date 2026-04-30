/**
 * Publishing Worker Publisher
 * Roteia publicacao por canal e atualiza status no banco.
 * POS-MVP (CL-107) — Rastreabilidade: TASK-7 ST002
 * TASK-12 ST003 (CL-193): dispatch via adapter-like registry local.
 *
 * Canais suportados (mesmo contrato do `src/lib/publishing/adapters/` canonico):
 *   BLOG      → chama API interna de blog
 *   INSTAGRAM → chama API interna de instagram
 *   LINKEDIN / TIKTOK / YOUTUBE → modo assistido (marca como pronto para copiar)
 *
 * Espelho leve dos adapters Next.js (o worker e package separado — nao pode
 * importar `@/lib/publishing/adapters`). Ao evoluir contratos de canal,
 * atualizar AMBOS os lados.
 */

import type { PrismaClient } from '@prisma/client'
import type { Redis } from '@upstash/redis'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const WORKER_AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN ?? ''

// TASK-12 ST003: adapter-like registry local. Espelho de
// `src/lib/publishing/adapters/index.ts#getAdapter` no worker.
type WorkerChannelAdapter = {
  mode: 'auto' | 'assisted'
  route: (postId: string) => Promise<void>
}

const WORKER_ADAPTERS: Record<string, WorkerChannelAdapter> = {
  BLOG: {
    mode: 'auto',
    route: (postId) => callInternalApi(`/api/v1/blog/articles/${postId}/publish`, 'POST'),
  },
  INSTAGRAM: {
    mode: 'auto',
    route: (postId) => callInternalApi('/api/instagram/publish', 'POST', { postId }),
  },
  LINKEDIN: {
    mode: 'assisted',
    route: async (postId) => {
      log({ event: 'assisted_publish_ready', postId, channel: 'LINKEDIN', note: 'manual copy required', timestamp: new Date().toISOString() })
    },
  },
  TIKTOK: {
    mode: 'assisted',
    route: async (postId) => {
      log({ event: 'assisted_publish_ready', postId, channel: 'TIKTOK', note: 'manual copy required (pos-MVP)', timestamp: new Date().toISOString() })
    },
  },
  YOUTUBE: {
    mode: 'assisted',
    route: async (postId) => {
      log({ event: 'assisted_publish_ready', postId, channel: 'YOUTUBE', note: 'manual copy required (pos-MVP)', timestamp: new Date().toISOString() })
    },
  },
}

/** Espelho local de `getAdapter` em `src/lib/publishing/adapters`. */
function getAdapter(channel: string): WorkerChannelAdapter {
  const adapter = WORKER_ADAPTERS[channel.toUpperCase()]
  if (!adapter) throw new Error(`Canal desconhecido: ${channel}`)
  return adapter
}

export async function publishPost(
  postId: string,
  channel: string,
  db: PrismaClient,
  _redis: Redis,
): Promise<void> {
  log({ event: 'publishing_start', postId, channel, timestamp: new Date().toISOString() })

  // Marcar como PUBLISHING
  await db.publishingQueue.update({
    where: { postId },
    data: { status: 'PROCESSING' },
  })

  try {
    await routeByChannel(postId, channel)

    await db.$transaction([
      // RS-3: QueueStatus.DONE = publicacao concluida com sucesso.
      // PostStatus.PUBLISHED = post publicado (terminal).
      // Os dois enums sao distintos.
      db.publishingQueue.update({
        where: { postId },
        data: { status: 'DONE', publishedAt: new Date() },
      }),
      db.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      }),
    ])

    log({ event: 'publishing_done', postId, channel, timestamp: new Date().toISOString() })
  } catch (err) {
    log({ event: 'publishing_failed', postId, channel, error: String(err), timestamp: new Date().toISOString() })
    await handleFailure(postId, err, db)
  }
}

async function routeByChannel(postId: string, channel: string): Promise<void> {
  // TASK-12 ST003: dispatch via adapter registry, sem if/else embutido.
  const adapter = getAdapter(channel)
  await adapter.route(postId)
}

async function callInternalApi(path: string, method: string, body?: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${WORKER_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`API ${path} retornou ${res.status}: ${errBody}`)
  }
}

async function handleFailure(postId: string, err: unknown, db: PrismaClient): Promise<void> {
  const record = await db.publishingQueue.findUnique({ where: { postId } })
  const attempts = (record?.attempts ?? 0) + 1
  const maxAttempts = record?.maxAttempts ?? 3

  if (attempts >= maxAttempts) {
    await db.publishingQueue.update({
      where: { postId },
      data: { status: 'FAILED', attempts, errorMessage: String(err) },
    })
    await db.post.update({
      where: { id: postId },
      data: { status: 'FAILED' },
    })
    log({ event: 'publishing_permanently_failed', postId, attempts, timestamp: new Date().toISOString() })
  } else {
    // Retry em 5 minutos
    const retryAt = new Date(Date.now() + 5 * 60_000)
    await db.publishingQueue.update({
      where: { postId },
      data: { status: 'PENDING', attempts, scheduledAt: retryAt, errorMessage: String(err) },
    })
    log({ event: 'publishing_retry_scheduled', postId, attempts, retryAt, timestamp: new Date().toISOString() })
  }
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
