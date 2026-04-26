/**
 * TASK-4 ST002 — testes unit (mocked prisma) de trackJob.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    workerJob: {
      create: mockCreate,
      update: mockUpdate,
      findUnique: mockFindUnique,
    },
  },
}))

import { trackJob } from '@/lib/workers/track-job'

describe('trackJob', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockUpdate.mockReset()
    mockFindUnique.mockReset()
    mockCreate.mockResolvedValue({ id: 'job-1' })
    mockUpdate.mockResolvedValue({})
  })

  it('marca COMPLETED em caso de sucesso', async () => {
    const { result } = await trackJob({ type: 'test.ok' }, async () => 'done')
    expect(result).toBe('done')
    const calls = mockUpdate.mock.calls
    expect(calls[0][0].data.status).toBe('RUNNING')
    expect(calls[1][0].data.status).toBe('COMPLETED')
  })

  it('marca FAILED em primeira falha e propaga erro', async () => {
    await expect(
      trackJob({ type: 'test.err' }, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    const last = mockUpdate.mock.calls.at(-1)![0]
    expect(last.data.status).toBe('FAILED')
    expect(last.data.error).toContain('boom')
  })

  it('move para DEAD_LETTER apos exceder WORKER_MAX_RETRIES', async () => {
    mockFindUnique.mockResolvedValue({ retryCount: 3 })
    await expect(
      trackJob(
        { type: 'test.dlq', retryOf: 'prev-id', maxRetries: 3 },
        async () => {
          throw new Error('gave up')
        },
      ),
    ).rejects.toThrow()
    const last = mockUpdate.mock.calls.at(-1)![0]
    expect(last.data.status).toBe('DEAD_LETTER')
  })
})
