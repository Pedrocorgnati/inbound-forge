/**
 * Testes de Integração — Rate Limit de Login (TST-014)
 *
 * Cobre: SEC-005 (rate limiting), THREAT-001 (brute force)
 * Rastreabilidade: TASK-7/ST001
 *
 * Estratégia: mock do Redis para testar o módulo src/lib/auth/rate-limit.ts
 * isoladamente sem dependência de Upstash real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Redis — antes de qualquer import do módulo que usa redis
const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  ttl: vi.fn(),
  ping: vi.fn().mockResolvedValue('PONG'),
}

vi.mock('@/lib/redis', () => ({
  redis: redisMock,
  REDIS_TTL: {
    workerHeartbeat: 60,
    rateLimitWindow: 900,
    sessionCache: 3600,
  },
  QUEUE_KEYS: {},
  CACHE_KEYS: { THEMES: 'cache:themes', WORKER_STATUS: 'cache:worker_status' },
}))

const {
  checkRateLimit,
  incrementLoginAttempts,
  lockAccount,
  isAccountLocked,
  clearLoginAttempts,
  getLockoutDurationSeconds,
} = await import('@/lib/auth/rate-limit')

describe('Rate Limit — Login (TST-014 / SEC-005)', () => {
  const IP = '192.168.1.100'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Cenários principais ───────────────────────────────────────────────────

  it('[SECURITY] bloqueia após 5 tentativas → allowed: false + lockAccount chamado', async () => {
    // Sem lock existente, mas com 5 tentativas acumuladas
    redisMock.get.mockImplementation(async (key: string) => {
      if (key.includes('lock:')) return null  // sem lock
      return 5                                  // 5 tentativas
    })
    redisMock.set.mockResolvedValue('OK')
    redisMock.ttl.mockResolvedValue(-1)

    const result = await checkRateLimit(IP)

    expect(result.allowed).toBe(false)
    expect(result.attempts).toBe(5)
    // Deve ter chamado lockAccount (redis.set no prefixo lock)
    expect(redisMock.set).toHaveBeenCalledWith(
      expect.stringContaining('lock:'),
      expect.any(String),
      expect.objectContaining({ ex: expect.any(Number) })
    )
  })

  it('[SECURITY] retorna lockedUntil (Retry-After) quando conta está bloqueada', async () => {
    const ttlRestante = 840  // 14 min restantes (segunda tentativa ainda na janela)

    redisMock.get.mockImplementation(async (key: string) => {
      if (key.includes('lock:')) return Date.now().toString()
      return null
    })
    redisMock.ttl.mockResolvedValue(ttlRestante)

    const result = await checkRateLimit(IP)

    expect(result.allowed).toBe(false)
    expect(result.lockedUntil).toBeInstanceOf(Date)
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
  })

  it('[SUCCESS] libera após janela expirar (Redis retorna null para chaves expiradas)', async () => {
    // Sem lock e sem contador (janela expirou)
    redisMock.get.mockResolvedValue(null)
    redisMock.ttl.mockResolvedValue(-2)

    const result = await checkRateLimit(IP)

    expect(result.allowed).toBe(true)
    expect(result.attempts).toBe(0)
    expect(result.lockedUntil).toBeUndefined()
  })

  it('[SECURITY] contador é por identificador (IP), não global', async () => {
    const IP_A = '10.0.0.1'
    const IP_B = '10.0.0.2'

    redisMock.get.mockImplementation(async (key: string) => {
      if (key.includes('lock:')) return null
      if (key.includes(IP_A)) return 5  // IP_A tem 5 tentativas
      return null                         // IP_B não tem tentativas
    })
    redisMock.set.mockResolvedValue('OK')
    redisMock.ttl.mockResolvedValue(-1)

    const [resultA, resultB] = await Promise.all([
      checkRateLimit(IP_A),
      checkRateLimit(IP_B),
    ])

    expect(resultA.allowed).toBe(false)
    expect(resultB.allowed).toBe(true)
  })

  it('[UNIT] 1ª tentativa: incr + expire chamados com TTL rateLimitWindow', async () => {
    redisMock.incr.mockResolvedValue(1)  // primeira tentativa
    redisMock.expire.mockResolvedValue(1)

    const count = await incrementLoginAttempts(IP)

    expect(count).toBe(1)
    expect(redisMock.incr).toHaveBeenCalledWith(`auth:ratelimit:${IP}`)
    // expire só é setado na 1ª tentativa (count === 1) para preservar janela
    expect(redisMock.expire).toHaveBeenCalledWith(`auth:ratelimit:${IP}`, 900)
  })

  it('[UNIT] tentativas subsequentes: incr chamado, expire NÃO (preserva janela)', async () => {
    redisMock.incr.mockResolvedValue(3)  // 3ª tentativa
    redisMock.expire.mockResolvedValue(1)

    await incrementLoginAttempts(IP)

    expect(redisMock.incr).toHaveBeenCalled()
    expect(redisMock.expire).not.toHaveBeenCalled()
  })

  it('[UNIT] clearLoginAttempts remove a chave do Redis', async () => {
    redisMock.del.mockResolvedValue(1)

    await clearLoginAttempts(IP)

    expect(redisMock.del).toHaveBeenCalledWith(`auth:ratelimit:${IP}`)
  })

  it('[UNIT] isAccountLocked retorna locked: false quando chave não existe', async () => {
    redisMock.get.mockResolvedValue(null)

    const result = await isAccountLocked(IP)

    expect(result.locked).toBe(false)
    expect(result.ttl).toBeUndefined()
  })

  it('[UNIT] isAccountLocked retorna locked: true + TTL quando chave existe', async () => {
    redisMock.get.mockResolvedValue(Date.now().toString())
    redisMock.ttl.mockResolvedValue(540)

    const result = await isAccountLocked(IP)

    expect(result.locked).toBe(true)
    expect(result.ttl).toBe(540)
  })
})

describe('Progressive Lock Escalation (THREAT-001 / RN-016)', () => {
  const IP = '192.168.1.100'

  beforeEach(() => {
    vi.clearAllMocks()
    redisMock.set.mockResolvedValue('OK')
  })

  it('[SECURITY] 1ª violação (failedLogins=5): lockout de 15 min (900s)', async () => {
    const duration = getLockoutDurationSeconds(5)
    expect(duration).toBe(900)
  })

  it('[SECURITY] 2ª violação (failedLogins=10): lockout de 1 hora (3600s)', async () => {
    const duration = getLockoutDurationSeconds(10)
    expect(duration).toBe(3600)
  })

  it('[SECURITY] 3ª+ violação (failedLogins=15): lockout de 24 horas (86400s)', async () => {
    const duration = getLockoutDurationSeconds(15)
    expect(duration).toBe(86400)
  })

  it('[SECURITY] failedLogins=7 (tier 1): duração 900s', async () => {
    expect(getLockoutDurationSeconds(7)).toBe(900)
  })

  it('[SECURITY] failedLogins=12 (tier 2): duração 3600s', async () => {
    expect(getLockoutDurationSeconds(12)).toBe(3600)
  })

  it('[SECURITY] lockAccount com 10 tentativas usa duração 1h (3600s)', async () => {
    await lockAccount(IP, 10)

    expect(redisMock.set).toHaveBeenCalledWith(
      `auth:lock:${IP}`,
      expect.any(String),
      { ex: 3600 }
    )
  })

  it('[SECURITY] lockAccount com 15+ tentativas usa duração 24h (86400s)', async () => {
    await lockAccount(IP, 16)

    expect(redisMock.set).toHaveBeenCalledWith(
      `auth:lock:${IP}`,
      expect.any(String),
      { ex: 86400 }
    )
  })

  it('[SECURITY] checkRateLimit com 10 tentativas retorna lockedUntil ~1h no futuro', async () => {
    redisMock.get.mockImplementation(async (key: string) => {
      if (key.includes('lock:')) return null
      return 10
    })
    redisMock.set.mockResolvedValue('OK')
    redisMock.ttl.mockResolvedValue(-1)

    const result = await checkRateLimit(IP)

    expect(result.allowed).toBe(false)
    // lockedUntil deve ser ~1h no futuro (3600s)
    const diffMs = result.lockedUntil!.getTime() - Date.now()
    expect(diffMs).toBeGreaterThan(3500 * 1000)  // > 3500s
    expect(diffMs).toBeLessThan(3700 * 1000)     // < 3700s (tolerância)
  })
})
