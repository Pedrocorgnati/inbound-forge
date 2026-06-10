// module-9: Reaper Tests (WK-WRK-03)
// Verifica recuperacao de jobs presos em PROCESSING: requeue vs dead-letter.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reapStalledJobs } from '../reaper'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn()
const mockUpdate = vi.fn()
const mockRpush = vi.fn()

const mockDb = {
  imageJob: { findMany: mockFindMany, update: mockUpdate },
} as any

const mockRedis = { rpush: mockRpush } as any

const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

describe('reapStalledJobs', () => {
  beforeEach(() => {
    mockFindMany.mockReset()
    mockUpdate.mockReset().mockResolvedValue({})
    mockRpush.mockReset().mockResolvedValue(1)
    stdoutSpy.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('re-enqueues a stalled job with retryCount below deadLetterAfter', async () => {
    mockFindMany.mockResolvedValue([{ id: 'job-stale-1', retryCount: 0 }])

    const reaped = await reapStalledJobs(mockDb, mockRedis)

    expect(reaped).toBe(1)
    // findMany filters on PROCESSING + stale updatedAt
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PROCESSING', updatedAt: expect.objectContaining({ lt: expect.any(Date) }) }),
      }),
    )
    // Reopened as PENDING with retryCount incremented
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'job-stale-1' },
      data: { status: 'PENDING', retryCount: 1 },
    })
    // Pushed back to the main queue
    expect(mockRpush).toHaveBeenCalledWith('worker:image:queue', JSON.stringify({ jobId: 'job-stale-1' }))
  })

  it('moves a stalled job to DEAD_LETTER when retryCount reaches deadLetterAfter', async () => {
    mockFindMany.mockResolvedValue([{ id: 'job-stale-2', retryCount: 2 }])

    const reaped = await reapStalledJobs(mockDb, mockRedis)

    expect(reaped).toBe(1)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'job-stale-2' },
      data: expect.objectContaining({ status: 'DEAD_LETTER', retryCount: 3 }),
    })
    expect(mockRpush).toHaveBeenCalledWith('worker:image:dead-letter', expect.any(String))
    const payload = JSON.parse(mockRpush.mock.calls[0][1] as string)
    expect(payload).toEqual(
      expect.objectContaining({ jobId: 'job-stale-2', error: 'reaped_stalled', retryCount: 3 }),
    )
  })

  it('returns 0 and does nothing when no stalled jobs', async () => {
    mockFindMany.mockResolvedValue([])

    const reaped = await reapStalledJobs(mockDb, mockRedis)

    expect(reaped).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockRpush).not.toHaveBeenCalled()
  })
})
