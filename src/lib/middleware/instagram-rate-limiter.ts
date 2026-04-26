/**
 * Instagram Rate Limiter — Inbound Forge
 * TASK-5 ST005 / intake-review Publishing Service
 *
 * Sliding window rate limiter para a Instagram Graph API (CL-057).
 * Usa Redis ZADD com timestamps para janela deslizante.
 */
import { redis } from '@/lib/redis'
import { INSTAGRAM_RATE_LIMITS } from '@/lib/constants/rate-limits'

const KEYS = {
  requestsWindow: 'instagram:rate:requests',
  postsWindow: 'instagram:rate:posts',
}

/**
 * Verifica se é possível publicar respeitando os rate limits.
 * Usa sliding window de 1h para requests e 24h para posts.
 */
export async function canPublish(): Promise<boolean> {
  try {
    const now = Date.now()
    const requestWindowStart = now - INSTAGRAM_RATE_LIMITS.windowMs
    const postWindowStart = now - INSTAGRAM_RATE_LIMITS.dayWindowMs

    const [requestCount, postCount] = await Promise.all([
      redis.zcount(KEYS.requestsWindow, requestWindowStart, '+inf'),
      redis.zcount(KEYS.postsWindow, postWindowStart, '+inf'),
    ])

    return (
      requestCount < INSTAGRAM_RATE_LIMITS.requestsPerHour &&
      postCount < INSTAGRAM_RATE_LIMITS.postsPerDay
    )
  } catch {
    // Redis indisponível — permitir publicação (falha aberta)
    return true
  }
}

/**
 * Registra uma publicação no sliding window.
 * Deve ser chamado após publicação bem-sucedida.
 */
export async function recordPublish(): Promise<void> {
  try {
    const now = Date.now()
    const member = `${now}-${Math.random().toString(36).slice(2)}`

    await Promise.all([
      redis.zadd(KEYS.requestsWindow, { score: now, member }),
      redis.zadd(KEYS.postsWindow, { score: now, member }),
      // Limpar entradas antigas (além de 24h)
      redis.zremrangebyscore(KEYS.requestsWindow, 0, now - INSTAGRAM_RATE_LIMITS.dayWindowMs),
      redis.zremrangebyscore(KEYS.postsWindow, 0, now - INSTAGRAM_RATE_LIMITS.dayWindowMs),
    ])
  } catch {
    // Redis indisponível — não bloquear publicação
  }
}

/**
 * Retorna quota restante para requests e posts.
 */
export async function getRemainingQuota(): Promise<{ requests: number; posts: number }> {
  try {
    const now = Date.now()
    const [requestCount, postCount] = await Promise.all([
      redis.zcount(KEYS.requestsWindow, now - INSTAGRAM_RATE_LIMITS.windowMs, '+inf'),
      redis.zcount(KEYS.postsWindow, now - INSTAGRAM_RATE_LIMITS.dayWindowMs, '+inf'),
    ])

    return {
      requests: Math.max(0, INSTAGRAM_RATE_LIMITS.requestsPerHour - (requestCount as number)),
      posts: Math.max(0, INSTAGRAM_RATE_LIMITS.postsPerDay - (postCount as number)),
    }
  } catch {
    return {
      requests: INSTAGRAM_RATE_LIMITS.requestsPerHour,
      posts: INSTAGRAM_RATE_LIMITS.postsPerDay,
    }
  }
}

/**
 * Estima segundos até o rate limit ser liberado.
 */
export async function getRetryAfterSeconds(): Promise<number> {
  return Math.ceil(INSTAGRAM_RATE_LIMITS.windowMs / 1000)
}
