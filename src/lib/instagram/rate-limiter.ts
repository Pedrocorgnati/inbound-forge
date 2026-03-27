/**
 * Instagram Rate Limiter — module-12-calendar-publishing
 * Usa Upstash Redis para controle de rate limits da Graph API.
 * 200 req/hora | 100 posts/24h
 * INT-021 | INT-118 | SYS_002
 */
import { redis } from '@/lib/redis'
import { INSTAGRAM_RATE_LIMITS } from '@/lib/constants/publishing'

export interface RateLimitStatus {
  requestsThisHour: number
  postsToday: number
  canPublish: boolean
  reason: string | null
}

/**
 * Verifica rate limits antes de cada operação.
 * Incrementa contador de requests.
 */
export async function checkRateLimits(): Promise<RateLimitStatus> {
  const now = Date.now()

  // Janela de 1 hora para requests (200 req/h)
  const hourBucket = Math.floor(now / 3_600_000)
  const hourKey = `instagram:req:${hourBucket}`
  const hourCount = await redis.incr(hourKey)
  if (hourCount === 1) await redis.expire(hourKey, 3600)

  // Janela de 24 horas para posts (100 posts/24h)
  const dayBucket = Math.floor(now / 86_400_000)
  const dayKey = `instagram:posts:${dayBucket}`
  const dayPostCount = (await redis.get<number>(dayKey)) ?? 0

  const reachedHourLimit = hourCount > INSTAGRAM_RATE_LIMITS.requestsPerHour
  const reachedDayLimit = dayPostCount >= INSTAGRAM_RATE_LIMITS.postsPerDay

  return {
    requestsThisHour: hourCount,
    postsToday: dayPostCount,
    canPublish: !reachedHourLimit && !reachedDayLimit,
    reason: reachedHourLimit
      ? `Rate limit de requests atingido (${INSTAGRAM_RATE_LIMITS.requestsPerHour}/hora)`
      : reachedDayLimit
        ? `Limite diário de posts atingido (${INSTAGRAM_RATE_LIMITS.postsPerDay}/dia)`
        : null,
  }
}

/**
 * Incrementa contador de posts publicados.
 * Chamar APÓS publicação bem-sucedida.
 */
export async function incrementPostCount(): Promise<void> {
  const dayBucket = Math.floor(Date.now() / 86_400_000)
  const dayKey = `instagram:posts:${dayBucket}`
  await redis.incr(dayKey)
  await redis.expire(dayKey, 86400)
}

/**
 * Retorna status atual dos rate limits sem incrementar.
 */
export async function getRateLimitStatus(): Promise<{ requestsThisHour: number; postsToday: number }> {
  const now = Date.now()
  const hourKey = `instagram:req:${Math.floor(now / 3_600_000)}`
  const dayKey = `instagram:posts:${Math.floor(now / 86_400_000)}`

  const [hourCount, dayCount] = await Promise.all([
    redis.get<number>(hourKey) ?? 0,
    redis.get<number>(dayKey) ?? 0,
  ])

  return { requestsThisHour: hourCount ?? 0, postsToday: dayCount ?? 0 }
}
