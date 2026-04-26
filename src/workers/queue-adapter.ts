/**
 * Queue adapter — Inbound Forge
 * TASK-4 ST002 / CL-236
 *
 * Abstrai Redis vs DB-polling para a fila de publishing.
 * Quando o circuit breaker detecta Redis fora do ar, o adapter
 * cai automaticamente para polling do `PublishingQueue` na DB.
 */
import { redis, QUEUE_KEYS } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { withRedisFallback, isRedisAvailable } from '@/lib/redis/with-fallback'

export interface PublishingJob {
  postId: string
  channel: string
}

const POLLING_BATCH = 10

/**
 * Enfileira job de publishing. Tenta Redis; em fallback, o item ja esta
 * na tabela `PublishingQueue` (status PENDING) — nao e necessario escrever
 * na DB novamente, pois `processQueue` consulta a DB diretamente.
 */
export async function enqueue(job: PublishingJob): Promise<void> {
  await withRedisFallback(
    () => redis.lpush(QUEUE_KEYS.publishing, JSON.stringify(job)).then(() => undefined),
    async () => {
      // Fallback: job ja existe em PublishingQueue como PENDING — no-op aqui.
      // O polling do `dequeue` vai encontra-lo automaticamente.
      console.info(`[queue-adapter] Redis indisponivel — postId=${job.postId} sera processado via DB polling`)
    }
  )
}

/**
 * Retira um batch de jobs. Com Redis, pop da fila; sem Redis, consulta DB.
 */
export async function dequeue(batchSize = POLLING_BATCH): Promise<PublishingJob[]> {
  return withRedisFallback(
    async () => {
      const jobs: PublishingJob[] = []
      for (let i = 0; i < batchSize; i++) {
        const raw = await redis.rpop(QUEUE_KEYS.publishing)
        if (!raw) break
        try {
          jobs.push(typeof raw === 'string' ? JSON.parse(raw) : (raw as PublishingJob))
        } catch {
          /* item malformado — descartar */
        }
      }
      return jobs
    },
    async () => {
      const items = await prisma.publishingQueue.findMany({
        where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        take: batchSize,
        include: { post: { select: { channel: true } } },
      })
      return items.map((item) => ({
        postId: item.postId,
        channel: item.post?.channel ?? 'unknown',
      }))
    }
  )
}

export function isUsingFallback(): boolean {
  return !isRedisAvailable()
}
