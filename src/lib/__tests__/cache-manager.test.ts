/**
 * cache-manager.test.ts
 * Rastreabilidade: TASK-4/ST003
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCached, invalidate, invalidatePattern, CACHE_TTL } from '@/lib/cache-manager'

// Mock redis
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn(() => ({
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  },
  QUEUE_KEYS: {},
}))

describe('getCached', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna valor do cache quando existe (cache hit)', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.get).mockResolvedValue({ data: 'cached' })

    const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' })
    const result = await getCached('test:key', 300, fetcher)

    expect(result).toEqual({ data: 'cached' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('chama fetcher quando cache miss (null)', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.get).mockResolvedValue(null)

    const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' })
    const result = await getCached('test:key', 300, fetcher)

    expect(result).toEqual({ data: 'fresh' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('armazena resultado no Redis após cache miss', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.get).mockResolvedValue(null)

    const fetcher = vi.fn().mockResolvedValue({ analytics: true })
    await getCached('analytics:funnel', CACHE_TTL.ANALYTICS, fetcher)

    expect(redis.set).toHaveBeenCalledWith(
      'analytics:funnel',
      { analytics: true },
      { ex: CACHE_TTL.ANALYTICS }
    )
  })

  it('não propaga erro se Redis falhar — retorna dado fresco', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.get).mockRejectedValue(new Error('Redis down'))

    const fetcher = vi.fn().mockResolvedValue({ fallback: true })
    const result = await getCached('test:key', 60, fetcher)

    expect(result).toEqual({ fallback: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('CACHE_TTL — constantes documentadas', () => {
  it('ANALYTICS é 300 segundos (5 minutos)', () => {
    expect(CACHE_TTL.ANALYTICS).toBe(300)
  })

  it('HEALTH é 30 segundos', () => {
    expect(CACHE_TTL.HEALTH).toBe(30)
  })

  it('THEME é 60 segundos', () => {
    expect(CACHE_TTL.THEME).toBe(60)
  })

  it('todos os TTLs são números positivos', () => {
    for (const [key, value] of Object.entries(CACHE_TTL)) {
      expect(typeof value).toBe('number')
      expect(value).toBeGreaterThan(0)
    }
  })
})

describe('invalidate', () => {
  it('deleta chave do Redis', async () => {
    const { redis } = await import('@/lib/redis')
    await invalidate('cache:analytics:funnel')
    expect(redis.del).toHaveBeenCalledWith('cache:analytics:funnel')
  })

  it('não lança exceção se Redis falhar', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.del).mockRejectedValue(new Error('Redis down'))
    await expect(invalidate('any:key')).resolves.not.toThrow()
  })
})

describe('invalidatePattern', () => {
  it('retorna 0 quando nenhuma chave encontrada', async () => {
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.keys).mockResolvedValue([])
    const count = await invalidatePattern('cache:analytics:*')
    expect(count).toBe(0)
  })
})
