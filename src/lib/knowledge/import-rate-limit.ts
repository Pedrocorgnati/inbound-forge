import { redis } from '@/lib/redis'

/**
 * Rate limit dedicado ao endpoint POST /api/v1/knowledge/import.
 * Why: import processa potencialmente milhares de inserts em uma chamada — muito mais
 * caro que requests normais. O rate limit generico (15min/login) nao protege contra
 * abuso por usuario autenticado. Limite adicional: 5 imports por hora por usuario.
 */
export const IMPORT_RATE_LIMIT = {
  maxPerWindow: 5,
  windowSeconds: 3600, // 1 hora
} as const

export const IMPORT_PAYLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10 MB
  maxEntries: 1000,
} as const

const KEY_PREFIX = 'knowledge:import:ratelimit'

export interface ImportRateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

export async function checkImportRateLimit(userId: string): Promise<ImportRateLimitResult> {
  const key = `${KEY_PREFIX}:${userId}`
  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, IMPORT_RATE_LIMIT.windowSeconds)
  }

  if (count > IMPORT_RATE_LIMIT.maxPerWindow) {
    const ttl = await redis.ttl(key)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ttl > 0 ? ttl : IMPORT_RATE_LIMIT.windowSeconds,
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, IMPORT_RATE_LIMIT.maxPerWindow - count),
  }
}

export interface PayloadValidationResult {
  ok: boolean
  reason?: 'PAYLOAD_TOO_LARGE' | 'TOO_MANY_ENTRIES'
  detail?: string
}

export function validateImportPayloadSize(rawBytes: number): PayloadValidationResult {
  if (rawBytes > IMPORT_PAYLOAD_LIMITS.maxBytes) {
    return {
      ok: false,
      reason: 'PAYLOAD_TOO_LARGE',
      detail: `Payload de ${rawBytes} bytes excede limite de ${IMPORT_PAYLOAD_LIMITS.maxBytes} bytes`,
    }
  }
  return { ok: true }
}

export function countImportEntries(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0
  const obj = payload as Record<string, unknown>
  let total = 0
  for (const key of ['cases', 'pains', 'patterns', 'objections']) {
    const arr = obj[key]
    if (Array.isArray(arr)) total += arr.length
  }
  return total
}

export function validateImportEntryCount(payload: unknown): PayloadValidationResult {
  const total = countImportEntries(payload)
  if (total > IMPORT_PAYLOAD_LIMITS.maxEntries) {
    return {
      ok: false,
      reason: 'TOO_MANY_ENTRIES',
      detail: `Total de ${total} entries excede limite de ${IMPORT_PAYLOAD_LIMITS.maxEntries}`,
    }
  }
  return { ok: true }
}
