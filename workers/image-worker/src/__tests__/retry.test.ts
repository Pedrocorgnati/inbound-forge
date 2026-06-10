// module-9: Retry + Dead-Letter Queue Tests
// Rastreabilidade: TASK-1 ST003, INT-059, INT-083, FEAT-creative-generation-003
// WK-WRK-05: retries persistidos em Redis ZSET (zadd) + drenados por drainDueRetries.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpush = vi.fn()
const mockZadd = vi.fn()
const mockZrange = vi.fn()
const mockZrem = vi.fn()
const mockRedisInstance = { rpush: mockRpush, zadd: mockZadd, zrange: mockZrange, zrem: mockZrem }

vi.mock('../redis-client', () => ({
  getRedisClient: () => mockRedisInstance,
}))

// afterEach usa clearAllMocks (nao restoreAllMocks): assim o spy de stdout
// permanece vivo entre os testes (apenas o historico de chamadas e limpado),
// senao asserts de log nos testes seguintes ao 1o falhariam.
const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb(jobOverrides: Record<string, unknown> = {}) {
  const findUniqueOrThrow = vi.fn()
  const update = vi.fn().mockResolvedValue({})

  const baseJob = {
    id: 'job-r1',
    retryCount: 0,
    contentPieceId: 'cp-1',
    templateId: 'tmpl-1',
    ...jobOverrides,
  }

  findUniqueOrThrow.mockResolvedValue(baseJob)

  return {
    mock: { imageJob: { findUniqueOrThrow, update } } as any,
    findUniqueOrThrow,
    update,
    baseJob,
  }
}

describe('handleRetry', () => {
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

  // ---------- First failure: persist retry in ZSET with 5s backoff score ----------

  it('increments retryCount to 1 and persists retry in the ZSET (5s backoff)', async () => {
    const { mock, update } = makeDb({ retryCount: 0 })
    const error = new Error('provider_timeout')

    await handleRetry('job-r1', error, mock)

    // DB updated to PENDING with retryCount 1
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: { status: 'PENDING', retryCount: 1 },
    })

    // Retry persisted immediately as ZSET member; backoff is the score, not a timer.
    expect(mockZadd).toHaveBeenCalledWith(
      'worker:image:retry',
      { score: expect.any(Number), member: 'job-r1' },
    )
    // No direct requeue to the main queue at scheduling time.
    expect(mockRpush).not.toHaveBeenCalled()

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('"event":"job_retry"') && l.includes('"retryCount":1'))).toBe(true)
  })

  // ---------- Second failure: retryCount 2, still persisted in ZSET ----------

  it('increments retryCount to 2 and persists retry in the ZSET', async () => {
    const { mock, update } = makeDb({ retryCount: 1 })
    const error = new Error('network_error')

    await handleRetry('job-r1', error, mock)

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: { status: 'PENDING', retryCount: 2 },
    })
    expect(mockZadd).toHaveBeenCalledWith(
      'worker:image:retry',
      { score: expect.any(Number), member: 'job-r1' },
    )
    expect(mockRpush).not.toHaveBeenCalled()
  })

  // ---------- Third failure: dead-letter ----------

  it('moves job to DEAD_LETTER after 3rd failure (deadLetterAfter = 3)', async () => {
    const { mock, update } = makeDb({ retryCount: 2, contentPieceId: 'cp-99', templateId: 'tmpl-5' })
    const error = new Error('fatal_crash')

    await handleRetry('job-r1', error, mock)

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: {
        status: 'DEAD_LETTER',
        retryCount: 3,
        errorMessage: 'Error: fatal_crash',
      },
    })

    // Dead-letter still uses rpush to the dead-letter list (not the ZSET).
    expect(mockRpush).toHaveBeenCalledWith('worker:image:dead-letter', expect.any(String))
    expect(mockZadd).not.toHaveBeenCalled()

    const payload = JSON.parse(mockRpush.mock.calls[0][1] as string)
    expect(payload).toEqual(
      expect.objectContaining({
        jobId: 'job-r1',
        error: 'Error: fatal_crash',
        retryCount: 3,
        contentPieceId: 'cp-99',
        templateId: 'tmpl-5',
      }),
    )
    expect(payload.failedAt).toEqual(expect.any(Number))

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('"event":"dead_letter"'))).toBe(true)
  })

  // ---------- Dead-letter Redis failure is non-fatal ----------

  it('does not throw when dead-letter rpush fails', async () => {
    mockRpush.mockRejectedValue(new Error('redis_down'))

    const { mock, update } = makeDb({ retryCount: 2 })

    await expect(handleRetry('job-r1', new Error('err'), mock)).resolves.toBeUndefined()

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DEAD_LETTER' }),
      }),
    )
  })

  // ---------- drainDueRetries: requeue due jobs ----------

  describe('drainDueRetries', () => {
    it('requeues a due job to the main queue (zrem claim succeeds)', async () => {
      mockZrange.mockResolvedValue(['job-x'])
      mockZrem.mockResolvedValue(1)

      await drainDueRetries(mockRedisInstance as any)

      expect(mockZrange).toHaveBeenCalledWith('worker:image:retry', 0, expect.any(Number), { byScore: true })
      expect(mockZrem).toHaveBeenCalledWith('worker:image:retry', 'job-x')
      expect(mockRpush).toHaveBeenCalledWith('worker:image:queue', JSON.stringify({ jobId: 'job-x' }))
    })

    it('does NOT requeue when zrem claim fails (already claimed by another tick)', async () => {
      mockZrange.mockResolvedValue(['job-y'])
      mockZrem.mockResolvedValue(0)

      await drainDueRetries(mockRedisInstance as any)

      expect(mockRpush).not.toHaveBeenCalled()
    })

    it('is defensive: zrange error does not throw', async () => {
      mockZrange.mockRejectedValue(new Error('redis_down'))

      await expect(drainDueRetries(mockRedisInstance as any)).resolves.toBeUndefined()
      expect(mockRpush).not.toHaveBeenCalled()
    })
  })
})
