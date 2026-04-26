/**
 * Rate limiter sliding window para APIs publicas do blog.
 * Intake-Review TASK-19 ST001 (CL-OP-033).
 *
 * 60 req/min/IP. Failopen se Redis indisponivel.
 */
import { redis } from '@/lib/redis'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const KEY_PREFIX = 'blog-public:ratelimit:'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function checkBlogPublicRateLimit(
  ip: string,
  opts: { max?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  const max = opts.max ?? MAX_REQUESTS
  const windowMs = opts.windowMs ?? WINDOW_MS
  const now = Date.now()
  const key = `${KEY_PREFIX}${ip}`
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`

  try {
    const [, , count] = (await Promise.all([
      redis.zadd(key, { score: now, member }),
      redis.zremrangebyscore(key, 0, now - windowMs),
      redis.zcount(key, now - windowMs, '+inf'),
    ])) as [number, number, number]

    // Expire TTL para garantir limpeza
    await redis.expire(key, Math.ceil(windowMs / 1000) * 2)

    if (count > max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      }
    }
    return {
      allowed: true,
      remaining: Math.max(0, max - count),
      retryAfterSeconds: 0,
    }
  } catch {
    // Failopen: Redis indisponivel nao bloqueia requisicoes
    return { allowed: true, remaining: max, retryAfterSeconds: 0 }
  }
}

export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
