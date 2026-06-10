import { redis } from '@/lib/redis'
import { extractClientIp, type RateLimitResult } from '@/lib/rate-limit/blog-public'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 5
const KEY_PREFIX = 'diagnostico-public:ratelimit:'

export { extractClientIp }
export type { RateLimitResult }

export async function checkDiagnosticoPublicRateLimit(ip: string): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `${KEY_PREFIX}${ip}`
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`

  try {
    const [, , count] = (await Promise.all([
      redis.zadd(key, { score: now, member }),
      redis.zremrangebyscore(key, 0, now - WINDOW_MS),
      redis.zcount(key, now - WINDOW_MS, '+inf'),
    ])) as [number, number, number]

    await redis.expire(key, Math.ceil(WINDOW_MS / 1000) * 2)

    if (count > MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(WINDOW_MS / 1000),
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, MAX_REQUESTS - count),
      retryAfterSeconds: 0,
    }
  } catch {
    return { allowed: true, remaining: MAX_REQUESTS, retryAfterSeconds: 0 }
  }
}

