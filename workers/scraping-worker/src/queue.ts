/**
 * Redis Queue Producer — Scraping Worker
 * TASK-1 ST002 / CX-06 / module-6-scraping-worker
 *
 * Producer BullMQ que enfileira jobs de scraping usando
 * chaves canônicas REDIS_KEYS (CX-06).
 * SEC-008: logs apenas contêm batchId, sourceCount — NUNCA URLs ou rawText.
 */
import { Queue, type ConnectionOptions } from 'bullmq'
import type { ScrapingJob, ScrapingJobResult } from './types'
import { REDIS_KEYS } from './constants'

const QUEUE_NAME = 'scraping'

let _queue: Queue<ScrapingJob, ScrapingJobResult> | undefined

function getConnection(): ConnectionOptions {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error('[Queue] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set')
  }

  // BullMQ suporta conexão via URL Redis — Upstash expõe endpoint Redis-compatible
  // Para uso com @upstash/redis REST API, usamos um adapter customizado abaixo.
  // Aqui assumimos que o Upstash fornece endpoint Redis TCP (upstash redis pro / serverless tcp).
  const parsed = new URL(url.replace('https://', 'rediss://'))
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: token,
    tls: {},
  }
}

export function getQueue(): Queue<ScrapingJob, ScrapingJobResult> {
  if (!_queue) {
    _queue = new Queue<ScrapingJob, ScrapingJobResult>(QUEUE_NAME, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    })
  }
  return _queue
}

/**
 * Enfileira um batch de scraping.
 * Retorna o batchId e a contagem de jobs enfileirados.
 * SEC-008: log não contém URLs.
 */
export async function enqueueBatch(job: ScrapingJob): Promise<{ batchId: string; queued: number }> {
  const queue = getQueue()

  const jobName = REDIS_KEYS.SCRAPING_BATCH(job.batchId)
  await queue.add(jobName, job, {
    jobId: job.batchId,
  })

  console.info(
    `[Queue] Batch enqueued | batchId=${job.batchId} | sourceCount=${job.sourceIds.length} | triggeredBy=${job.triggeredBy}`
  )

  return { batchId: job.batchId, queued: job.sourceIds.length }
}

export async function closeQueue(): Promise<void> {
  if (_queue) {
    await _queue.close()
    _queue = undefined
  }
}
