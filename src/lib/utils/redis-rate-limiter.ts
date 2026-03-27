/**
 * Redis Rate Limiter — Inbound Forge
 * Módulo: module-8-content-generation (TASK-4/ST005)
 *
 * Rate limiter por operador com TTL até meia-noite UTC usando @upstash/redis.
 */
import { redis } from '@/lib/redis'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number  // timestamp Unix de quando o limite reseta (meia-noite UTC)
}

/**
 * Verifica e incrementa o contador de rate limit para uma ação.
 * @param operatorId - ID do operador
 * @param action - Nome da ação (ex: 'adapt')
 * @param maxRequests - Máximo de requests permitidos
 */
export async function checkRateLimit(
  operatorId: string,
  action: string,
  maxRequests: number
): Promise<RateLimitResult> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const key = `ratelimit:${action}:${operatorId}:${today}`

  // Calculate seconds until midnight UTC
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const ttlSeconds = Math.ceil((midnight.getTime() - now.getTime()) / 1000)
  const retryAfter = Math.floor(midnight.getTime() / 1000)

  // Atomic INCR + EXPIRE pipeline
  const pipeline = redis.pipeline()
  pipeline.incr(key)
  pipeline.expire(key, ttlSeconds)
  const [count] = await pipeline.exec() as [number, unknown]

  const remaining = Math.max(0, maxRequests - (count as number))
  const allowed = (count as number) <= maxRequests

  return { allowed, remaining, retryAfter: allowed ? undefined : retryAfter }
}
