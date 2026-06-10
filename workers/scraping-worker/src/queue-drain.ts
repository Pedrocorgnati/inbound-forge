/**
 * Queue Drain — CX-06 fix
 *
 * O app Next.js (trigger manual + cron de rescraping) so consegue produzir via
 * Upstash REST (`lpush`), nao via BullMQ (que exige conexao TCP). Antes, esses
 * jobs iam para `scraping:<batchId>` e NINGUEM consumia (orfaos write-only).
 *
 * Este drenador faz `lpop` da fila canonica unica `worker:scraping:queue` (onde o
 * app passou a empilhar os ScrapingJobs) e faz a ponte para o BullMQ do worker via
 * enqueueBatch — reusando exatamente o mesmo pipeline de processamento que o cron
 * interno ja usa. Espelha o padrao lpop-polling de image/video workers.
 *
 * SEC-008: logs apenas com batchId/sourceCount — nunca URLs.
 */
import type { Redis } from '@upstash/redis'
import type { ScrapingJob } from './types'
import { enqueueBatch } from './queue'
import { REDIS_KEYS } from './constants'

const POLL_INTERVAL_MS = 5_000

function log(data: Record<string, unknown>): void {
  console.info(JSON.stringify({ component: 'queue-drain', ...data }))
}

function parseJob(raw: unknown): ScrapingJob | null {
  // @upstash/redis pode devolver string (JSON.stringify do app) ou ja-objeto
  // (auto-deserializacao); aceitar ambos.
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!obj || typeof obj !== 'object') return null
  const job = obj as Partial<ScrapingJob>
  if (typeof job.batchId !== 'string' || !Array.isArray(job.sourceIds)) return null
  return {
    batchId: job.batchId,
    sourceIds: job.sourceIds,
    triggeredBy: job.triggeredBy ?? 'manual',
    createdAt: job.createdAt ?? new Date().toISOString(),
  }
}

/**
 * Drena TODOS os jobs disponiveis na fila canonica neste tick, fazendo ponte para
 * o BullMQ. Defensivo: erros de Redis/parse nao derrubam o loop (logam e seguem).
 */
export async function drainScrapingQueue(redis: Redis): Promise<number> {
  let drained = 0

  while (true) {
    let raw: string | null
    try {
      raw = await redis.lpop<string>(REDIS_KEYS.SCRAPING_QUEUE)
    } catch (err) {
      log({ event: 'lpop_error', error: String(err), timestamp: new Date().toISOString() })
      return drained
    }

    if (raw === null || raw === undefined) return drained

    let job: ScrapingJob | null
    try {
      job = parseJob(raw)
    } catch {
      log({ event: 'parse_error', timestamp: new Date().toISOString() })
      continue
    }
    if (!job) {
      log({ event: 'invalid_job_shape', timestamp: new Date().toISOString() })
      continue
    }

    try {
      await enqueueBatch(job)
      drained++
      log({ event: 'bridged_to_bullmq', batchId: job.batchId, sourceCount: job.sourceIds.length, triggeredBy: job.triggeredBy, timestamp: new Date().toISOString() })
    } catch (err) {
      // BullMQ indisponivel: re-empilha para nao perder o job (best-effort).
      log({ event: 'enqueue_failed', batchId: job.batchId, error: String(err), timestamp: new Date().toISOString() })
      try {
        await redis.rpush(REDIS_KEYS.SCRAPING_QUEUE, JSON.stringify(job))
      } catch {
        // se nem o re-push der, o job se perde — ja logado acima.
      }
      return drained
    }
  }
}

let drainTimer: NodeJS.Timeout | null = null
let running = false

export function startQueueDrain(redis: Redis): NodeJS.Timeout {
  drainTimer = setInterval(() => {
    if (running) return // evita sobreposicao de ticks
    running = true
    drainScrapingQueue(redis)
      .catch((err) => log({ event: 'drain_tick_error', error: String(err), timestamp: new Date().toISOString() }))
      .finally(() => { running = false })
  }, POLL_INTERVAL_MS)
  log({ event: 'started', key: REDIS_KEYS.SCRAPING_QUEUE, intervalMs: POLL_INTERVAL_MS })
  return drainTimer
}

export function stopQueueDrain(): void {
  if (drainTimer) {
    clearInterval(drainTimer)
    drainTimer = null
    log({ event: 'stopped' })
  }
}
