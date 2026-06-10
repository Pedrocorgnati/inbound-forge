// TQ-TST-07/08 — heartbeat do video-worker (workerHealth.upsert type VIDEO).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startHeartbeat } from '../health'

const mockUpsert = vi.fn()
const mockDb = { workerHealth: { upsert: mockUpsert } } as any

const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

describe('video startHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUpsert.mockReset().mockResolvedValue({})
    stderrSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('faz upsert ACTIVE de type VIDEO a cada intervalo de heartbeat', async () => {
    const timer = startHeartbeat(mockDb)
    await vi.advanceTimersByTimeAsync(30_000)
    clearInterval(timer)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'VIDEO' },
        create: expect.objectContaining({ type: 'VIDEO', status: 'ACTIVE' }),
        update: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    )
  })

  it('upsert rejeitando emite heartbeat_failed no stderr (nao quebra)', async () => {
    mockUpsert.mockRejectedValue(new Error('db down'))
    const timer = startHeartbeat(mockDb)
    await vi.advanceTimersByTimeAsync(30_000)
    clearInterval(timer)

    const errs = stderrSpy.mock.calls.map(([arg]) => String(arg))
    expect(errs.some((l) => l.includes('heartbeat_failed'))).toBe(true)
  })
})
