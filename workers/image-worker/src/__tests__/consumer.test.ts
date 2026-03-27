// module-9: Consumer Loop Tests
// Rastreabilidade: TASK-1 ST002, INT-057, INT-058, CX-06, IMAGE_080

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the module under test is imported
// ---------------------------------------------------------------------------

const mockLpop = vi.fn()
const mockRpush = vi.fn()
const mockRedis = { lpop: mockLpop, rpush: mockRpush } as any

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockDb = {
  imageJob: { findUnique: mockFindUnique, update: mockUpdate },
} as any

const mockGenerateImage = vi.fn()

vi.mock('../generate', () => ({
  generateImage: (...args: unknown[]) => mockGenerateImage(...args),
}))

vi.mock('../retry', () => ({
  handleRetry: vi.fn(),
}))

// Capture stdout writes for log assertions
const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: 'postgres://test',
    UPSTASH_REDIS_REST_URL: 'https://redis.test',
    UPSTASH_REDIS_REST_TOKEN: 'tok',
    NEXT_PUBLIC_SUPABASE_URL: 'https://supa.test',
    SUPABASE_SERVICE_ROLE_KEY: 'svc',
    SUPABASE_STORAGE_BUCKET: 'bucket',
    IDEOGRAM_API_KEY: 'ideo',
    FAL_API_KEY: 'fal',
    IMAGE_WORKER_TIMEOUT_MS: 5_000,
    ...overrides,
  } as any
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    prompt: 'test prompt',
    contentPieceId: 'cp-1',
    metadata: { headline: 'Test Headline' },
    retryCount: 0,
    template: { templateType: 'CAROUSEL' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// We cannot call startConsumerLoop directly (infinite loop + process.exit).
// Instead we test the internal logic by importing the module and simulating
// the loop mechanics via controlled lpop responses.
// ---------------------------------------------------------------------------

// To test processJob we re-export it or access it indirectly.
// The consumer exposes only startConsumerLoop + registerSigtermHandler.
// Strategy: import the module, call startConsumerLoop with a redis mock that
// returns one job then sets isShuttingDown via SIGTERM simulation.

describe('consumer', () => {
  let consumer: typeof import('../consumer')
  let retryModule: typeof import('../retry')

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    mockLpop.mockReset()
    mockUpdate.mockReset()
    mockFindUnique.mockReset()
    mockGenerateImage.mockReset()
    stdoutSpy.mockClear()

    // Re-import to get a fresh `isShuttingDown = false`
    consumer = await import('../consumer')
    retryModule = await import('../retry')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ---------- SIGTERM ----------

  it('registerSigtermHandler sets isShuttingDown on SIGTERM', () => {
    // registerSigtermHandler is called inside startConsumerLoop, but we can
    // also call it directly to validate the handler registration.
    consumer.registerSigtermHandler()

    // Emit SIGTERM
    process.emit('SIGTERM', 'SIGTERM')

    // The only observable effect: next iteration should stop the loop.
    // We verify indirectly by checking the log output when the loop ends.
    // Since the flag is module-scoped and not exported, we rely on the loop
    // exiting. For a direct test we check the stdout log.
    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('sigterm_received'))).toBe(true)
  })

  // ---------- Job dispatched and processed successfully ----------

  it('processes a job from the queue successfully', async () => {
    const job = makeJob()
    const env = makeEnv()

    // First call returns a job, second call — simulate SIGTERM so the loop stops
    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return JSON.stringify({ jobId: 'job-1' })
      // After first job, trigger shutdown
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    mockFindUnique.mockResolvedValue(job)
    mockUpdate.mockResolvedValue({})
    mockGenerateImage.mockResolvedValue('https://cdn.test/img.webp')

    // Mock process.exit to prevent vitest from dying
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      await consumer.startConsumerLoop(mockRedis, mockDb, env)
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    // findUnique called with job-1
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      include: { template: true },
    })

    // Status updated to PROCESSING then DONE
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'job-1' }, data: { status: 'PROCESSING' } })
    )
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'DONE', imageUrl: 'https://cdn.test/img.webp' }),
      })
    )

    exitSpy.mockRestore()
  })

  // ---------- Job not found — IMAGE_080 ----------

  it('logs IMAGE_080 when job is not found in DB', async () => {
    const env = makeEnv()

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return JSON.stringify({ jobId: 'ghost-job' })
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    mockFindUnique.mockResolvedValue(null) // job not found

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      await consumer.startConsumerLoop(mockRedis, mockDb, env)
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('IMAGE_080') && l.includes('ghost-job'))).toBe(true)

    // Should NOT have tried to update status
    expect(mockUpdate).not.toHaveBeenCalled()

    exitSpy.mockRestore()
  })

  // ---------- generateImage throws — triggers handleRetry ----------

  it('calls handleRetry when generateImage throws', async () => {
    const job = makeJob()
    const env = makeEnv()
    const genError = new Error('provider_down')

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return JSON.stringify({ jobId: 'job-fail' })
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    mockFindUnique.mockResolvedValue({ ...job, id: 'job-fail' })
    mockUpdate.mockResolvedValue({})
    mockGenerateImage.mockRejectedValue(genError)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      await consumer.startConsumerLoop(mockRedis, mockDb, env)
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    expect(retryModule.handleRetry).toHaveBeenCalledWith('job-fail', genError, mockDb)

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('job_failed'))).toBe(true)

    exitSpy.mockRestore()
  })

  // ---------- AbortController timeout ----------

  it('aborts generateImage when timeout fires', async () => {
    const job = makeJob()
    const env = makeEnv({ IMAGE_WORKER_TIMEOUT_MS: 100 })

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return JSON.stringify({ jobId: 'job-timeout' })
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    mockFindUnique.mockResolvedValue({ ...job, id: 'job-timeout' })
    mockUpdate.mockResolvedValue({})

    // generateImage hangs long enough for the abort to fire
    mockGenerateImage.mockImplementation(async (_opts: any, _db: any, _env: any, signal: AbortSignal) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      // Advance timers to trigger the abort timeout
      const loopPromise = consumer.startConsumerLoop(mockRedis, mockDb, env)
      await vi.advanceTimersByTimeAsync(200)
      await loopPromise
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    expect(retryModule.handleRetry).toHaveBeenCalledWith(
      'job-timeout',
      expect.any(DOMException),
      mockDb
    )

    exitSpy.mockRestore()
  })

  // ---------- Redis lpop error — retries after polling interval ----------

  it('continues polling when redis.lpop throws', async () => {
    const env = makeEnv()

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) throw new Error('ECONNRESET')
      // Second call succeeds but empty, then shutdown
      if (callCount === 2) {
        process.emit('SIGTERM', 'SIGTERM')
        return null
      }
      return null
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      const loopPromise = consumer.startConsumerLoop(mockRedis, mockDb, env)
      // Advance past the polling sleep (3000ms default)
      await vi.advanceTimersByTimeAsync(4_000)
      await loopPromise
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('redis_lpop_error'))).toBe(true)
    // Should have called lpop at least twice (retry after error)
    expect(mockLpop.mock.calls.length).toBeGreaterThanOrEqual(2)

    exitSpy.mockRestore()
  })

  // ---------- Malformed queue message ----------

  it('skips malformed JSON in queue without crashing', async () => {
    const env = makeEnv()

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) return 'NOT_VALID_JSON{'
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as any)

    try {
      await consumer.startConsumerLoop(mockRedis, mockDb, env)
    } catch (e: any) {
      expect(e.message).toBe('__EXIT__')
    }

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('queue_parse_error'))).toBe(true)

    exitSpy.mockRestore()
  })
})
