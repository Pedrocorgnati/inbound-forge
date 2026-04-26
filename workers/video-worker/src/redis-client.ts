// Video Worker: Redis Client (Upstash)

import { Redis } from '@upstash/redis'
import type { VideoWorkerEnv } from './env'

let _redis: Redis | null = null

export function getRedisClient(env: VideoWorkerEnv): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}
