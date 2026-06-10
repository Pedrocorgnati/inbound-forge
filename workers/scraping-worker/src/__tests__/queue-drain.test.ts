// CX-06 — drainScrapingQueue: lpop da fila canonica -> ponte para enqueueBatch (BullMQ).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockEnqueueBatch = vi.fn()
vi.mock('../queue', () => ({
  enqueueBatch: (...args: unknown[]) => mockEnqueueBatch(...args),
}))

import { drainScrapingQueue } from '../queue-drain'

function makeRedis(lpopSeq: unknown[]) {
  let i = 0
  return {
    lpop: vi.fn(async () => (i < lpopSeq.length ? lpopSeq[i++] : null)),
    rpush: vi.fn(),
  } as any
}

const job = (batchId: string) => JSON.stringify({
  batchId,
  sourceIds: ['s1', 's2'],
  triggeredBy: 'manual',
  createdAt: '2026-06-10T00:00:00.000Z',
})

beforeEach(() => {
  mockEnqueueBatch.mockReset().mockResolvedValue({ batchId: 'x', queued: 2 })
  vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('drainScrapingQueue', () => {
  it('drena todos os jobs da fila e faz ponte para enqueueBatch', async () => {
    const redis = makeRedis([job('b1'), job('b2')]) // depois null

    const drained = await drainScrapingQueue(redis)

    expect(drained).toBe(2)
    expect(mockEnqueueBatch).toHaveBeenCalledTimes(2)
    expect(mockEnqueueBatch).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: 'b1', sourceIds: ['s1', 's2'], triggeredBy: 'manual' }),
    )
    // lpop ate retornar null
    expect(redis.lpop).toHaveBeenCalledWith('worker:scraping:queue')
  })

  it('fila vazia: nao chama enqueueBatch', async () => {
    const redis = makeRedis([])
    const drained = await drainScrapingQueue(redis)
    expect(drained).toBe(0)
    expect(mockEnqueueBatch).not.toHaveBeenCalled()
  })

  it('aceita objeto ja-deserializado (auto-deserialize do @upstash/redis)', async () => {
    const redis = makeRedis([{ batchId: 'b3', sourceIds: ['s9'], triggeredBy: 'cron', createdAt: 'now' }])
    const drained = await drainScrapingQueue(redis)
    expect(drained).toBe(1)
    expect(mockEnqueueBatch).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'b3', triggeredBy: 'cron' }))
  })

  it('job com shape invalido e pulado (sem derrubar o loop)', async () => {
    const redis = makeRedis([JSON.stringify({ nope: true }), job('b4')])
    const drained = await drainScrapingQueue(redis)
    expect(drained).toBe(1) // so o b4 valido
    expect(mockEnqueueBatch).toHaveBeenCalledTimes(1)
    expect(mockEnqueueBatch).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'b4' }))
  })

  it('enqueueBatch falhando: re-empilha o job e para o tick', async () => {
    mockEnqueueBatch.mockRejectedValueOnce(new Error('bullmq down'))
    const redis = makeRedis([job('b5'), job('b6')])

    const drained = await drainScrapingQueue(redis)

    expect(drained).toBe(0)
    expect(redis.rpush).toHaveBeenCalledWith('worker:scraping:queue', expect.stringContaining('b5'))
  })
})
