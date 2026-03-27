/**
 * Constants — Scraping Worker
 * TASK-0 ST002 / module-6-scraping-worker
 * Re-exporta constantes de src/lib/constants/scraping.constants.ts
 * com defaults para o ambiente standalone do worker Railway.
 */

export const WORKER_ID = process.env.WORKER_ID ?? 'scraping-worker-01'
export const HEARTBEAT_INTERVAL_MS = 30_000
export const MAX_HEARTBEAT_TTL_SECONDS = 90  // 3x o intervalo — TTL Redis
export const MAX_CONCURRENT_PAGES = Number(process.env.MAX_CONCURRENT_PAGES ?? 3)
export const PAGE_TIMEOUT_MS = Number(process.env.PAGE_TIMEOUT_MS ?? 30_000)
export const CRAWLER_MAX_RETRIES = 2
export const DEFAULT_CRON_SCHEDULE = process.env.SCRAPING_CRON_SCHEDULE ?? '0 2 * * *'
export const SCRAPING_BATCH_SIZE = Number(process.env.SCRAPING_BATCH_SIZE ?? 10)

// CX-06: chaves Redis (espelhadas do Next.js para uso standalone no worker)
export const REDIS_KEYS = {
  SCRAPING_BATCH: (batchId: string) => `scraping:${batchId}`,
  SCRAPING_RESULT: (batchId: string) => `scraping:result:${batchId}`,
  WORKER_HEARTBEAT: (workerId: string) => `worker:heartbeat:${workerId}`,
  SCRAPING_WORKER_STATUS: 'worker:scraping:status',
} as const
