// module-9: Consumer Loop Tests
// Rastreabilidade: TASK-1 ST002, INT-057, INT-058, CX-06, IMAGE_080
//
// WK-WRK-04: o loop NAO chama mais process.exit — ele apenas retorna quando
// isShuttingDown (sleep agora e interrompivel pelo SIGTERM). Os testes aguardam
// a Promise do loop resolver, sem mockar process.exit.
// WK-WRK-05: o consumer chama drainDueRetries(redis) no topo do loop (mockado aqui).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the module under test is imported
// ---------------------------------------------------------------------------

const mockLpop = vi.fn()
const mockRpush = vi.fn()
// Cancel-signal checks (sismember/srem) — resolve "nao cancelado" por padrao.
const mockSismember = vi.fn().mockResolvedValue(0)
const mockSrem = vi.fn()
const mockRedis = { lpop: mockLpop, rpush: mockRpush, sismember: mockSismember, srem: mockSrem } as any

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
  // WK-WRK-05: drain de retries persistidos — no-op nos testes do consumer.
  drainDueRetries: vi.fn().mockResolvedValue(undefined),
}))

// Capture stdout writes for log assertions. afterEach usa clearAllMocks (nao
// restoreAllMocks) para o spy permanecer vivo entre testes.
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
    mockSismember.mockReset().mockResolvedValue(0)
    stdoutSpy.mockClear()

    // Re-import to get a fresh `isShuttingDown = false`
    consumer = await import('../consumer')
    retryModule = await import('../retry')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ---------- SIGTERM ----------

  it('registerSigtermHandler sets isShuttingDown on SIGTERM', () => {
    consumer.registerSigtermHandler()
    process.emit('SIGTERM', 'SIGTERM')

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
      process.emit('SIGTERM', 'SIGTERM')
      return null
    })

    mockFindUnique.mockResolvedValue(job)
    mockUpdate.mockResolvedValue({})
    mockGenerateImage.mockResolvedValue('https://cdn.test/img.webp')

    // WK-WRK-04: loop retorna ao receber SIGTERM (sem process.exit).
    await consumer.startConsumerLoop(mockRedis, mockDb, env)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      include: { template: true },
    })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'job-1' }, data: { status: 'PROCESSING' } }),
    )
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'DONE', imageUrl: 'https://cdn.test/img.webp' }),
      }),
    )
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

    mockFindUnique.mockResolvedValue(null)

    await consumer.startConsumerLoop(mockRedis, mockDb, env)

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('IMAGE_080') && l.includes('ghost-job'))).toBe(true)
    expect(mockUpdate).not.toHaveBeenCalled()
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

    await consumer.startConsumerLoop(mockRedis, mockDb, env)

    expect(retryModule.handleRetry).toHaveBeenCalledWith('job-fail', genError, mockDb)

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('job_failed'))).toBe(true)
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

    mockGenerateImage.mockImplementation(async (_opts: any, _db: any, _env: any, signal: AbortSignal) => {
      return new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const loopPromise = consumer.startConsumerLoop(mockRedis, mockDb, env)
    await vi.advanceTimersByTimeAsync(200)
    await loopPromise

    expect(retryModule.handleRetry).toHaveBeenCalledWith(
      'job-timeout',
      expect.any(DOMException),
      mockDb,
    )
  })

  // ---------- Redis lpop error — retries after polling interval ----------

  it('continues polling when redis.lpop throws', async () => {
    const env = makeEnv()

    let callCount = 0
    mockLpop.mockImplementation(async () => {
      callCount++
      if (callCount === 1) throw new Error('ECONNRESET')
      if (callCount === 2) {
        process.emit('SIGTERM', 'SIGTERM')
        return null
      }
      return null
    })

    const loopPromise = consumer.startConsumerLoop(mockRedis, mockDb, env)
    // Advance past the polling sleep (3000ms default, interrompivel)
    await vi.advanceTimersByTimeAsync(4_000)
    await loopPromise

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('redis_lpop_error'))).toBe(true)
    expect(mockLpop.mock.calls.length).toBeGreaterThanOrEqual(2)
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

    await consumer.startConsumerLoop(mockRedis, mockDb, env)

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('queue_parse_error'))).toBe(true)
  })
})
