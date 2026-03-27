// module-9: Redis Client (Upstash)
// Rastreabilidade: TASK-1 ST002, INT-057

import { Redis } from '@upstash/redis'
import type { WorkerEnv } from './env'

let _redis: Redis | null = null

export function getRedisClient(env: WorkerEnv): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}
