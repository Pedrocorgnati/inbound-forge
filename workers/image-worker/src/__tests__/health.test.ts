// module-9: TASK-8 — Health tests (heartbeat + cost ring buffer)
// Rastreabilidade: TASK-8 ST001, CX-05, INT-084, FEAT-creative-generation-004

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Reset module state between tests (costLog, totalCostUsd are module-level)
let recordCost:     typeof import('../health').recordCost
let getCostLog:     typeof import('../health').getCostLog
let getTotalCostUsd: typeof import('../health').getTotalCostUsd
let startHeartbeat: typeof import('../health').startHeartbeat

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  const mod = await import('../health')
  recordCost     = mod.recordCost
  getCostLog     = mod.getCostLog
  getTotalCostUsd = mod.getTotalCostUsd
  startHeartbeat = mod.startHeartbeat
})

afterEach(() => {
  vi.useRealTimers()
})

// ── recordCost ───────────────────────────────────────────────────────────────

describe('recordCost', () => {
  const makeEntry = (id: string, cost = 0.04) => ({
    jobId:        id,
    provider:     'ideogram' as const,
    costUsd:      cost,
    templateType: 'ERROR_CARD' as const,
    durationMs:   1200,
    recordedAt:   new Date().toISOString(),
  })

  it('adds entry to ring buffer', () => {
    recordCost(makeEntry('job-1'))
    recordCost(makeEntry('job-2'))

    const log = getCostLog()
    expect(log).toHaveLength(2)
    expect(log[0].jobId).toBe('job-1')
    expect(log[1].jobId).toBe('job-2')
  })

  it('accumulates totalCostUsd', () => {
    recordCost(makeEntry('job-1', 0.04))
    recordCost(makeEntry('job-2', 0.015))

    expect(getTotalCostUsd()).toBeCloseTo(0.055, 4)
  })

  it('ring buffer respects max entries limit (100)', () => {
    // Fill beyond the 100-entry limit
    for (let i = 0; i < 105; i++) {
      recordCost(makeEntry(`job-${i}`, 0.01))
    }

    const log = getCostLog()
    expect(log).toHaveLength(100)
    // Oldest entries should have been shifted out
    expect(log[0].jobId).toBe('job-5')
    expect(log[99].jobId).toBe('job-104')
  })

  it('getCostLog returns a copy (not the internal array)', () => {
    recordCost(makeEntry('job-1'))
    const log = getCostLog()
    log.push(makeEntry('mutated'))

    expect(getCostLog()).toHaveLength(1)
  })
})

// ── startHeartbeat ───────────────────────────────────────────────────────────

describe('startHeartbeat', () => {
  it('upserts WorkerHealth record on interval', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({})
    const mockDb = {
      workerHealth: { upsert: mockUpsert },
    } as unknown as import('@prisma/client').PrismaClient

    const timer = startHeartbeat(mockDb)

    // Advance past one heartbeat interval (30s)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith({
      where:  { type: 'IMAGE' },
      create: expect.objectContaining({
        type:   'IMAGE',
        status: 'ACTIVE',
      }),
      update: expect.objectContaining({
        status: 'ACTIVE',
      }),
    })

    clearInterval(timer)
  })

  it('logs error to stderr when upsert fails', async () => {
    const mockUpsert = vi.fn().mockRejectedValue(new Error('DB connection lost'))
    const mockDb = {
      workerHealth: { upsert: mockUpsert },
    } as unknown as import('@prisma/client').PrismaClient

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const timer = startHeartbeat(mockDb)
    await vi.advanceTimersByTimeAsync(30_000)

    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const output = stderrSpy.mock.calls[0][0] as string
    expect(output).toContain('heartbeat_failed')
    expect(output).toContain('DB connection lost')

    stderrSpy.mockRestore()
    clearInterval(timer)
  })

  it('includes cost log in metadata payload', async () => {
    // Add some cost entries first
    recordCost({
      jobId: 'job-x', provider: 'ideogram', costUsd: 0.04,
      templateType: 'ERROR_CARD', durationMs: 800, recordedAt: new Date().toISOString(),
    })

    const mockUpsert = vi.fn().mockResolvedValue({})
    const mockDb = {
      workerHealth: { upsert: mockUpsert },
    } as unknown as import('@prisma/client').PrismaClient

    const timer = startHeartbeat(mockDb)
    await vi.advanceTimersByTimeAsync(30_000)

    const call = mockUpsert.mock.calls[0][0]
    expect(call.create.metadata).toEqual(
      expect.objectContaining({
        totalCostUsd: expect.any(Number),
        costLog:      expect.arrayContaining([
          expect.objectContaining({ jobId: 'job-x' }),
        ]),
      })
    )

    clearInterval(timer)
  })
})
