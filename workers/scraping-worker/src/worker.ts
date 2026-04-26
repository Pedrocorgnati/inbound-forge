/**
 * BullMQ Worker Consumer — Scraping Worker
 * TASK-1 ST002 / module-6-scraping-worker
 *
 * Consome jobs da fila `scraping` e executa o pipeline por fonte:
 *   1. Crawl (Playwright)
 *   2. Persistência de ScrapedText com rawText temporário
 *   3. Sinaliza para TASK-2 (classificação) e TASK-3 (anonimização)
 *
 * SEC-008: NUNCA logar rawText/processedText — apenas IDs e timestamps.
 * COMP-006: rawText é temporário e deve ser nulificado após 1h (TASK-3).
 */
import { Worker, type Job } from 'bullmq'
import pLimit from 'p-limit'
import { Redis } from '@upstash/redis'
import type { ScrapingJob, ScrapingJobResult } from './types'
import { getPrisma } from './db'
import { crawlUrl } from './crawler'
import { filterUnprotected, describeProtection } from './source-protection'
import { MAX_CONCURRENT_PAGES, REDIS_KEYS, WORKER_ID } from './constants'

const QUEUE_NAME = 'scraping'

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

function getConnection() {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const parsed = new URL(url.replace('https://', 'rediss://'))
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: token,
    tls: {},
  }
}

async function processScrapingJob(
  job: Job<ScrapingJob, ScrapingJobResult>
): Promise<ScrapingJobResult> {
  const { batchId, sourceIds } = job.data
  const prisma = getPrisma()
  const redis = getRedis()
  const limit = pLimit(MAX_CONCURRENT_PAGES)

  // Marcar worker como ACTIVE
  try {
    await prisma.workerHealth.upsert({
      where: { type: 'SCRAPING' },
      update: { status: 'ACTIVE' },
      create: { type: 'SCRAPING', status: 'ACTIVE' },
    })
  } catch (err) {
    console.error(`[Worker] Failed to mark ACTIVE | jobId=${job.id}`, err instanceof Error ? err.message : 'unknown')
  }

  // Buscar fontes
  const idsToProcess = sourceIds.length > 0 ? sourceIds : undefined
  const fetchedSources = await prisma.source.findMany({
    where: idsToProcess ? { id: { in: idsToProcess }, isActive: true } : { isActive: true },
    select: {
      id: true,
      url: true,
      selector: true,
      operatorId: true,
      isProtected: true,
      antiBotBlocked: true,
    },
  })

  // TASK-11 ST003 (CL-111): filtra fontes protegidas (curadas ou anti-bot blocked)
  // antes do enqueue dos crawls. Non-retry explicito.
  const protectedSources = fetchedSources.filter((s) => describeProtection(s).protected)
  const sources = filterUnprotected(fetchedSources)
  if (protectedSources.length > 0) {
    console.info(
      `[Worker] Skipping ${protectedSources.length} protected source(s) | batchId=${batchId} | reasons=${protectedSources
        .map((s) => `${s.id}:${describeProtection(s).reasons.join(',')}`)
        .join(';')}`
    )
  }

  console.info(`[Worker] Processing batch | batchId=${batchId} | sources=${sources.length} | jobId=${job.id}`)

  let processedCount = 0
  let candidatesCount = 0
  let rejectedCount = 0
  const errors: string[] = []

  // TTL 1h para expiração do rawText (COMP-006)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await Promise.all(
    sources.map((source) =>
      limit(async () => {
        try {
          const { rawText, title, extractedAt } = await crawlUrl(source.url, source.selector)

          if (!rawText) {
            rejectedCount++
            // SEC-008: log sem URL completa
            console.warn(`[Worker] Empty rawText | sourceId=${source.id} | batchId=${batchId}`)
            return
          }

          await prisma.scrapedText.create({
            data: {
              operatorId: source.operatorId,
              sourceId: source.id,
              batchId,
              url: source.url,
              title,
              rawText,              // COMP-006: temporário — expiresAt 1h
              isProcessed: false,
              isPainCandidate: false,
              piiRemoved: false,
              expiresAt,
            },
          })

          processedCount++

          // Atualizar lastCrawledAt na fonte
          await prisma.source.update({
            where: { id: source.id },
            data: { lastCrawledAt: new Date(extractedAt) },
          })
        } catch (err) {
          rejectedCount++
          const msg = err instanceof Error ? err.message : 'unknown'
          // SEC-008: log sem dados de conteúdo
          errors.push(`sourceId=${source.id}: ${msg}`)
          console.error(`[Worker] Source error | sourceId=${source.id} | batchId=${batchId}`, msg)
        }
      })
    )
  )

  const result: ScrapingJobResult = {
    batchId,
    processedCount,
    candidatesCount,
    rejectedCount,
    errors,
    completedAt: new Date().toISOString(),
  }

  // Gravar resultado no Redis (CX-06)
  try {
    await redis.set(
      REDIS_KEYS.SCRAPING_RESULT(batchId),
      JSON.stringify(result),
      { ex: 24 * 60 * 60 } // TTL 24h
    )
  } catch (err) {
    console.error(`[Worker] Failed to write result to Redis | batchId=${batchId}`, err instanceof Error ? err.message : 'unknown')
  }

  // Marcar worker como IDLE
  try {
    await prisma.workerHealth.update({
      where: { type: 'SCRAPING' },
      data: { status: 'IDLE' },
    })
  } catch (err) {
    console.error(`[Worker] Failed to mark IDLE | batchId=${batchId}`, err instanceof Error ? err.message : 'unknown')
  }

  console.info(
    `[Worker] Batch complete | batchId=${batchId} | processed=${processedCount} | rejected=${rejectedCount} | errors=${errors.length}`
  )

  return result
}

let _worker: Worker<ScrapingJob, ScrapingJobResult> | undefined

export function startWorker(): Worker<ScrapingJob, ScrapingJobResult> {
  if (_worker) return _worker

  _worker = new Worker<ScrapingJob, ScrapingJobResult>(
    QUEUE_NAME,
    (job) => processScrapingJob(job),
    {
      connection: getConnection(),
      concurrency: 1, // Um batch por vez — paralelismo dentro do batch via pLimit
    }
  )

  _worker.on('completed', (job) => {
    console.info(`[Worker] Job completed | jobId=${job.id} | workerId=${WORKER_ID}`)
  })

  _worker.on('failed', (job, err) => {
    console.error(
      `[Worker] Job failed | jobId=${job?.id ?? 'unknown'} | workerId=${WORKER_ID}`,
      err instanceof Error ? err.message : 'unknown'
    )
  })

  console.info(`[Worker] BullMQ worker started | queue=${QUEUE_NAME} | workerId=${WORKER_ID}`)
  return _worker
}

export async function stopWorker(): Promise<void> {
  if (_worker) {
    await _worker.close()
    _worker = undefined
    console.info(`[Worker] BullMQ worker stopped | workerId=${WORKER_ID}`)
  }
}
