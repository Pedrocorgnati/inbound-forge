/**
 * WK-WRK-06 — testes unit (mocked) do rescraping.worker.
 * Verifica que run() enfileira UM batch source-based real na fila Redis.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindMany, mockLpush, mockTrackJob } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockLpush: vi.fn(),
  mockTrackJob: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { source: { findMany: mockFindMany } },
}))

vi.mock('@/lib/redis', () => ({
  redis: { lpush: mockLpush },
}))

vi.mock('@/lib/workers/track-job', () => ({
  // trackJob executa o callback (onde acontece o lpush) e retorna o shape esperado.
  trackJob: mockTrackJob,
}))

import { run } from '@/workers/rescraping.worker'

describe('rescraping.worker run()', () => {
  beforeEach(() => {
    mockFindMany.mockReset()
    mockLpush.mockReset().mockResolvedValue(1)
    mockTrackJob.mockReset().mockImplementation(async (_input: unknown, fn: () => Promise<unknown>) => {
      const result = await fn()
      return { job: { id: 'job1' }, result }
    })
  })

  it('enfileira um batch source-based real de todas as Sources ativas', async () => {
    mockFindMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }])

    const res = await run()

    expect(res).toEqual({ enqueued: 2, skipped: 0 })

    // findMany usa o mesmo filtro do trigger route
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, antiBotBlocked: false } }),
    )

    // um unico lpush, numa chave scraping:<batchId>, com payload source-based
    expect(mockLpush).toHaveBeenCalledTimes(1)
    const [key, payload] = mockLpush.mock.calls[0]
    expect(key).toMatch(/^scraping:/)
    const job = JSON.parse(payload as string)
    expect(job.sourceIds).toEqual(['s1', 's2'])
    expect(job.triggeredBy).toBe('cron')
    expect(job.batchId).toEqual(expect.any(String))

    // trackJob registrou o lifecycle com o novo type
    expect(mockTrackJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rescraping.batch' }),
      expect.any(Function),
    )
  })

  it('retorna 0 e nao enfileira quando nao ha Sources ativas', async () => {
    mockFindMany.mockResolvedValue([])

    const res = await run()

    expect(res).toEqual({ enqueued: 0, skipped: 0 })
    expect(mockLpush).not.toHaveBeenCalled()
    expect(mockTrackJob).not.toHaveBeenCalled()
  })
})
