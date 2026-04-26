/**
 * CX-06: Canonical Redis queue key constants
 * Todos os workers devem importar daqui — NUNCA hardcodar strings de queue.
 * Owner: module-1/TASK-3 | Consumidores: module-6, module-9, module-12
 */

export const REDIS_KEYS = {
  // Queues de processamento
  SCRAPING_QUEUE: 'worker:scraping:queue',
  IMAGE_QUEUE: 'worker:image:queue',
  VIDEO_QUEUE: 'worker:video:queue',
  PUBLISH_QUEUE: 'worker:publishing:queue',

  // Health / heartbeat
  WORKER_HEALTH: (type: string) => `worker:health:${type}`,

  // Scraping batches — CX-06 (module-6)
  SCRAPING_BATCH: (batchId: string) => `scraping:${batchId}`,
  SCRAPING_RESULT: (batchId: string) => `scraping:result:${batchId}`,
  WORKER_HEARTBEAT: (workerId: string) => `worker:heartbeat:${workerId}`,
  SCRAPING_WORKER_STATUS: 'worker:scraping:status',

  // Cache
  ANALYTICS_FUNNEL: 'cache:analytics:funnel',
  ANALYTICS_THEMES: 'cache:analytics:themes',
  WORKER_STATUS: 'cache:worker_status',

  // Rate limiting
  RATE_LIMIT: (identifier: string) => `rl:${identifier}`,
} as const

export type QueueKey =
  | typeof REDIS_KEYS.SCRAPING_QUEUE
  | typeof REDIS_KEYS.IMAGE_QUEUE
  | typeof REDIS_KEYS.VIDEO_QUEUE
  | typeof REDIS_KEYS.PUBLISH_QUEUE
