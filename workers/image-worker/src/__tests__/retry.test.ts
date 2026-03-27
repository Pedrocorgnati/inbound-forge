// module-9: Retry + Dead-Letter Queue Tests
// Rastreabilidade: TASK-1 ST003, INT-059, INT-083, FEAT-creative-generation-003

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRpush = vi.fn()
const mockRedisInstance = { rpush: mockRpush }

vi.mock('../redis-client', () => ({
  getRedisClient: () => mockRedisInstance,
}))

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
  let setEnqueueFn: typeof import('../retry')['setEnqueueFn']

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    mockRpush.mockReset()
    stdoutSpy.mockClear()

    const mod = await import('../retry')
    handleRetry = mod.handleRetry
    setEnqueueFn = mod.setEnqueueFn
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ---------- First failure: retry with short backoff ----------

  it('increments retryCount to 1 and re-enqueues with 5s backoff', async () => {
    const { mock, update, findUniqueOrThrow } = makeDb({ retryCount: 0 })
    const error = new Error('provider_timeout')

    await handleRetry('job-r1', error, mock)

    // DB updated to PENDING with retryCount 1
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: { status: 'PENDING', retryCount: 1 },
    })

    // Re-enqueue happens after backoff (5000ms for first retry)
    // Use the fallback Redis rpush path (no enqueue fn set)
    await vi.advanceTimersByTimeAsync(5_000)

    expect(mockRpush).toHaveBeenCalledWith(
      'worker:image:queue',
      JSON.stringify({ jobId: 'job-r1' })
    )

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('"event":"job_retry"') && l.includes('"retryCount":1'))).toBe(true)
  })

  // ---------- Second failure: retryCount 2, longer backoff ----------

  it('increments retryCount to 2 and uses 15s backoff', async () => {
    const { mock, update } = makeDb({ retryCount: 1 })
    const error = new Error('network_error')

    await handleRetry('job-r1', error, mock)

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: { status: 'PENDING', retryCount: 2 },
    })

    // Should NOT have re-enqueued yet (backoff is 15s)
    expect(mockRpush).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(15_000)

    expect(mockRpush).toHaveBeenCalledWith(
      'worker:image:queue',
      JSON.stringify({ jobId: 'job-r1' })
    )
  })

  // ---------- Third failure: dead-letter ----------

  it('moves job to DEAD_LETTER after 3rd failure (deadLetterAfter = 3)', async () => {
    const { mock, update } = makeDb({ retryCount: 2, contentPieceId: 'cp-99', templateId: 'tmpl-5' })
    const error = new Error('fatal_crash')

    await handleRetry('job-r1', error, mock)

    // DB updated to DEAD_LETTER with retryCount 3
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-r1' },
      data: {
        status: 'DEAD_LETTER',
        retryCount: 3,
        errorMessage: 'Error: fatal_crash',
      },
    })

    // Dead-letter payload pushed to dead-letter queue
    expect(mockRpush).toHaveBeenCalledWith(
      'worker:image:dead-letter',
      expect.any(String)
    )

    // Validate dead-letter payload structure
    const payloadStr = mockRpush.mock.calls[0][1] as string
    const payload = JSON.parse(payloadStr)

    expect(payload).toEqual(
      expect.objectContaining({
        jobId: 'job-r1',
        error: 'Error: fatal_crash',
        retryCount: 3,
        contentPieceId: 'cp-99',
        templateId: 'tmpl-5',
      })
    )
    expect(payload.failedAt).toEqual(expect.any(Number))

    const logs = stdoutSpy.mock.calls.map(([arg]) => String(arg))
    expect(logs.some((l) => l.includes('"event":"dead_letter"'))).toBe(true)
  })

  // ---------- Dead-letter payload has all required fields ----------

  it('dead-letter payload includes jobId, error, failedAt, retryCount, contentPieceId, templateId', async () => {
    const { mock } = makeDb({
      retryCount: 2,
      contentPieceId: 'cp-dl',
      templateId: 'tmpl-dl',
    })

    await handleRetry('job-r1', new Error('boom'), mock)

    const payloadStr = mockRpush.mock.calls[0][1] as string
    const payload = JSON.parse(payloadStr)

    const requiredKeys = ['jobId', 'error', 'failedAt', 'retryCount', 'contentPieceId', 'templateId']
    for (const key of requiredKeys) {
      expect(payload).toHaveProperty(key)
    }
  })

  // ---------- Uses custom enqueue function when set ----------

  it('uses setEnqueueFn callback instead of direct Redis rpush', async () => {
    const customEnqueue = vi.fn()
    setEnqueueFn(customEnqueue)

    const { mock } = makeDb({ retryCount: 0 })

    await handleRetry('job-r1', new Error('retry-me'), mock)

    await vi.advanceTimersByTimeAsync(5_000)

    expect(customEnqueue).toHaveBeenCalledWith('job-r1')
    // Direct rpush should NOT have been called
    expect(mockRpush).not.toHaveBeenCalled()
  })

  // ---------- Dead-letter Redis failure is non-fatal ----------

  it('does not throw when dead-letter rpush fails', async () => {
    mockRpush.mockRejectedValue(new Error('redis_down'))

    const { mock, update } = makeDb({ retryCount: 2 })

    // Should not throw
    await expect(handleRetry('job-r1', new Error('err'), mock)).resolves.toBeUndefined()

    // DB was still updated to DEAD_LETTER
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DEAD_LETTER' }),
      })
    )
  })
})
