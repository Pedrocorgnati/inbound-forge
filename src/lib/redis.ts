import { Redis } from '@upstash/redis'
import { REDIS_KEYS } from '@/constants/redis-keys'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// CX-06: Queue keys derivadas do canonical src/constants/redis-keys.ts
export const QUEUE_KEYS = {
  scraping: REDIS_KEYS.SCRAPING_QUEUE,
  image: REDIS_KEYS.IMAGE_QUEUE,
  video: REDIS_KEYS.VIDEO_QUEUE,
  publishing: REDIS_KEYS.PUBLISH_QUEUE,
  workerHealth: REDIS_KEYS.WORKER_HEALTH,
} as const

// TTL constants (segundos)
export const REDIS_TTL = {
  workerHeartbeat: 60,      // 1 min — CX-05
  rateLimitWindow: 900,     // 15 min — SEC-005
  sessionCache: 3600,       // 1h
} as const

// Prefixos de cache
export const CACHE_KEYS = {
  THEMES: 'cache:themes',
  WORKER_STATUS: 'cache:worker_status',
} as const
