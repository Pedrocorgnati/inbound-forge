import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

const IP_WINDOW_MS = 60_000
const IP_LIMIT = 60
const SHORTLINK_WINDOW_MS = 1_000
const SHORTLINK_LIMIT = 10
const DEDUP_BUCKET_SECONDS = 5

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetSeconds: number
}

export type ClickDedupResult = {
  duplicate: boolean
  hash: string
  bucket: number
}

type SlidingWindowOptions = {
  key: string
  limit: number
  windowMs: number
}

async function checkSlidingWindowRateLimit({
  key,
  limit,
  windowMs,
}: SlidingWindowOptions): Promise<RateLimitResult> {
  const now = Date.now()
  const member = `${now}-${crypto.randomUUID()}`
  const windowSeconds = Math.ceil(windowMs / 1000)

  try {
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, now - windowMs)
    pipeline.zadd(key, { score: now, member })
    pipeline.zcount(key, now - windowMs, '+inf')
    pipeline.expire(key, windowSeconds * 2)
    const [, , count] = (await pipeline.exec()) as [number, number, number, number]

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: count <= limit ? 0 : windowSeconds,
      resetSeconds: windowSeconds,
    }
  } catch {
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0,
      resetSeconds: windowSeconds,
    }
  }
}

export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export async function checkPublicIpRateLimit(
  ip: string,
  scope = 'tracking-public',
): Promise<RateLimitResult> {
  return checkSlidingWindowRateLimit({
    key: `ratelimit:${scope}:ip:${ip}`,
    limit: IP_LIMIT,
    windowMs: IP_WINDOW_MS,
  })
}

export async function checkShortlinkClickRateLimit(shortlinkId: string): Promise<RateLimitResult> {
  return checkSlidingWindowRateLimit({
    key: `ratelimit:shortlink-click:${shortlinkId}`,
    limit: SHORTLINK_LIMIT,
    windowMs: SHORTLINK_WINDOW_MS,
  })
}

export async function checkClickDedup(input: {
  ip: string
  userAgent: string
  shortlinkId: string
  bucketSeconds?: number
}): Promise<ClickDedupResult> {
  const bucketSeconds = input.bucketSeconds ?? DEDUP_BUCKET_SECONDS
  const bucket = Math.floor(Date.now() / (bucketSeconds * 1000))
  const hash = crypto
    .createHash('sha256')
    .update(`${input.ip}:${input.userAgent}:${input.shortlinkId}:${bucket}`)
    .digest('hex')
  const key = `dedup:shortlink-click:${hash}`

  try {
    const inserted = await redis.set(key, '1', { nx: true, ex: bucketSeconds * 2 })
    return { duplicate: inserted !== 'OK', hash, bucket }
  } catch {
    return { duplicate: false, hash, bucket }
  }
}

export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitResult,
  correlationId?: string,
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimit.resetSeconds))
  if (rateLimit.retryAfterSeconds > 0) {
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
  }
  if (correlationId) {
    response.headers.set('X-Correlation-Id', correlationId)
  }
  return response
}

export function rateLimitExceededResponse(
  rateLimit: RateLimitResult,
  correlationId: string,
): NextResponse {
  return applyRateLimitHeaders(
    NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMITED',
        correlation_id: correlationId,
        retry_after_seconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 },
    ),
    rateLimit,
    correlationId,
  )
}
