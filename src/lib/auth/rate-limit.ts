import { redis, REDIS_TTL } from '@/lib/redis'
import { BUSINESS_RULES } from '@/types/constants'

const RATE_LIMIT_PREFIX = 'auth:ratelimit'
const LOCK_PREFIX = 'auth:lock'

/**
 * Retorna a duração de bloqueio em segundos com base no número de tentativas falhas.
 * Implementa escalação progressiva conforme THREAT-001 / RN-016:
 *   - failedLogins >= 15: 24 horas (86400s) — reincidente grave
 *   - failedLogins >= 10: 1 hora (3600s)    — reincidente
 *   - failedLogins >= 5:  15 minutos (900s) — primeira violação
 */
export function getLockoutDurationSeconds(failedLogins: number): number {
  if (failedLogins >= BUSINESS_RULES.ACCOUNT_LOCK_THRESHOLD_TIER3) {
    return BUSINESS_RULES.ACCOUNT_LOCK_DURATION_TIER3_SECONDS
  }
  if (failedLogins >= BUSINESS_RULES.ACCOUNT_LOCK_THRESHOLD_TIER2) {
    return BUSINESS_RULES.ACCOUNT_LOCK_DURATION_TIER2_SECONDS
  }
  return BUSINESS_RULES.ACCOUNT_LOCK_DURATION_TIER1_SECONDS
}

/**
 * Incrementa o contador de tentativas falhas de login para um identificador.
 * O TTL da janela é de 15min (REDIS_TTL.rateLimitWindow = 900s).
 */
export async function incrementLoginAttempts(identifier: string): Promise<number> {
  const key = `${RATE_LIMIT_PREFIX}:${identifier}`
  const count = await redis.incr(key)
  if (count === 1) {
    // Só seta TTL na primeira tentativa para preservar janela existente
    await redis.expire(key, REDIS_TTL.rateLimitWindow)
  }
  return count
}

/**
 * Bloqueia a conta com duração progressiva baseada em failedLogins (THREAT-001).
 * Uso: lockAccount(identifier, attempts) após incrementLoginAttempts().
 */
export async function lockAccount(identifier: string, failedLogins?: number): Promise<void> {
  const lockKey = `${LOCK_PREFIX}:${identifier}`
  const lockDuration = getLockoutDurationSeconds(failedLogins ?? BUSINESS_RULES.MAX_LOGIN_ATTEMPTS)
  await redis.set(lockKey, Date.now().toString(), { ex: lockDuration })
}

/**
 * Verifica se uma conta está bloqueada e retorna o TTL restante.
 */
export async function isAccountLocked(
  identifier: string
): Promise<{ locked: boolean; ttl?: number }> {
  const lockKey = `${LOCK_PREFIX}:${identifier}`
  const value = await redis.get<string>(lockKey)
  if (!value) return { locked: false }
  const ttl = await redis.ttl(lockKey)
  return { locked: true, ttl: ttl > 0 ? ttl : undefined }
}

/**
 * Limpa o contador de tentativas após login bem-sucedido.
 */
export async function clearLoginAttempts(identifier: string): Promise<void> {
  await redis.del(`${RATE_LIMIT_PREFIX}:${identifier}`)
}

/**
 * Verifica rate limit completo: lock primeiro, depois contador de tentativas.
 * SEC-005: bloqueia após MAX_LOGIN_ATTEMPTS tentativas falhas.
 */
export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean
  attempts: number
  lockedUntil?: Date
}> {
  const lockStatus = await isAccountLocked(identifier)
  if (lockStatus.locked) {
    return {
      allowed: false,
      attempts: BUSINESS_RULES.MAX_LOGIN_ATTEMPTS,
      lockedUntil: lockStatus.ttl
        ? new Date(Date.now() + lockStatus.ttl * 1000)
        : undefined,
    }
  }

  const key = `${RATE_LIMIT_PREFIX}:${identifier}`
  const attemptsRaw = await redis.get<number>(key)
  const attempts = attemptsRaw ?? 0

  if (attempts >= BUSINESS_RULES.MAX_LOGIN_ATTEMPTS) {
    await lockAccount(identifier, attempts)  // progressive lock: duração baseada em tentativas
    const lockDurationMs = getLockoutDurationSeconds(attempts) * 1000
    return {
      allowed: false,
      attempts,
      lockedUntil: new Date(Date.now() + lockDurationMs),
    }
  }

  return { allowed: true, attempts }
}
