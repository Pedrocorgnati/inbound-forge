// Source rate-limiter — token bucket in-memory por sourceId (TASK-11 ST004 / CL-064)
// Nota: em producao multi-replica substituir por Redis sorted set.

import { prisma } from '@/lib/prisma'

interface Bucket {
  tokens: number
  capacity: number
  refillPerSecond: number
  updatedAt: number
}

const buckets = new Map<string, Bucket>()

function getOrInit(sourceId: string, perMinute: number): Bucket {
  const capacity = Math.max(1, perMinute)
  const refillPerSecond = capacity / 60
  const existing = buckets.get(sourceId)
  if (!existing || existing.capacity !== capacity) {
    const next: Bucket = {
      tokens: capacity,
      capacity,
      refillPerSecond,
      updatedAt: Date.now(),
    }
    buckets.set(sourceId, next)
    return next
  }
  return existing
}

function refill(bucket: Bucket) {
  const now = Date.now()
  const elapsedSec = (now - bucket.updatedAt) / 1_000
  if (elapsedSec <= 0) return
  bucket.tokens = Math.min(
    bucket.capacity,
    bucket.tokens + elapsedSec * bucket.refillPerSecond,
  )
  bucket.updatedAt = now
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export async function checkSourceRateLimit(sourceId: string): Promise<RateLimitDecision> {
  const source = await prisma.source
    .findUnique({
      where: { id: sourceId },
      select: { rateLimitPerMinute: true },
    })
    .catch(() => null)
  const perMinute = source?.rateLimitPerMinute ?? 60
  const bucket = getOrInit(sourceId, perMinute)
  refill(bucket)
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 }
  }
  const deficit = 1 - bucket.tokens
  const retryAfterMs = Math.ceil((deficit / bucket.refillPerSecond) * 1_000)
  return { allowed: false, remaining: 0, retryAfterMs }
}

export function resetSourceRateLimiter(sourceId?: string) {
  if (sourceId) buckets.delete(sourceId)
  else buckets.clear()
}
