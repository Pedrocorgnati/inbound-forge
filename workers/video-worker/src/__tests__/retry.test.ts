// TQ-TST-07/08 — retry do video-worker (contrato WK-WRK-05: ZSET + drainDueRetries).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockRpush = vi.fn()
const mockZadd = vi.fn()
const mockZrange = vi.fn()
const mockZrem = vi.fn()
const mockRedisInstance = { rpush: mockRpush, zadd: mockZadd, zrange: mockZrange, zrem: mockZrem }

vi.mock('../redis-client', () => ({
  getRedisClient: () => mockRedisInstance,
}))

const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function makeDb(jobOverrides: Record<string, unknown> = {}) {
  const findUniqueOrThrow = vi.fn().mockResolvedValue({ id: 'vid-r1', retryCount: 0, ...jobOverrides })
  const update = vi.fn().mockResolvedValue({})
  return { mock: { videoJob: { findUniqueOrThrow, update } } as any, update }
}

describe('video handleRetry', () => {
  let handleRetry: typeof import('../retry')['handleRetry']
  let drainDueRetries: typeof import('../retry')['drainDueRetries']

  beforeEach(async () => {
    vi.resetModules()
    mockRpush.mockReset().mockResolvedValue(1)
    mockZadd.mockReset().mockResolvedValue(1)
    mockZrange.mockReset().mockResolvedValue([])
    mockZrem.mockReset().mockResolvedValue(1)
    stdoutSpy.mockClear()
    const mod = await import('../retry')
    handleRetry = mod.handleRetry
    drainDueRetries = mod.drainDueRetries
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('retryCount 0->1: persiste no ZSET worker:video:retry (sem rpush imediato)', async () => {
    const { mock, update } = makeDb({ retryCount: 0 })
    await handleRetry('vid-r1', new Error('boom'), mock)

    expect(update).toHaveBeenCalledWith({ where: { id: 'vid-r1' }, data: { status: 'PENDING', retryCount: 1 } })
    expect(mockZadd).toHaveBeenCalledWith('worker:video:retry', { score: expect.any(Number), member: 'vid-r1' })
    expect(mockRpush).not.toHaveBeenCalled()
  })

  it('retryCount 2->3: DEAD_LETTER + rpush na dead-letter', async () => {
    const { mock, update } = makeDb({ retryCount: 2 })
    await handleRetry('vid-r1', new Error('fatal'), mock)

    expect(update).toHaveBeenCalledWith({
      where: { id: 'vid-r1' },
      data: expect.objectContaining({ status: 'DEAD_LETTER', retryCount: 3 }),
    })
    expect(mockRpush).toHaveBeenCalledWith('worker:video:dead-letter', expect.any(String))
    expect(mockZadd).not.toHaveBeenCalled()
  })

  it('drainDueRetries: re-enfileira vencidos (zrem claim) e e defensivo', async () => {
    mockZrange.mockResolvedValue(['vid-x'])
    mockZrem.mockResolvedValue(1)
    await drainDueRetries(mockRedisInstance as any)
    expect(mockRpush).toHaveBeenCalledWith('worker:video:queue', JSON.stringify({ jobId: 'vid-x' }))

    mockRpush.mockClear()
    mockZrem.mockResolvedValue(0)
    mockZrange.mockResolvedValue(['vid-y'])
    await drainDueRetries(mockRedisInstance as any)
    expect(mockRpush).not.toHaveBeenCalled()
  })
})
