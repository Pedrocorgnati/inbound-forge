// TQ-TST-07/08 — dispatch por canal de publishPost (auto-fetch vs assisted vs
// handleFailure). Mocked: fetch, prisma, redis. BASE_URL e const de modulo
// (default http://localhost:3000) — assertar contra ela.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { publishPost } from '../publisher'

const mockFetch = vi.fn()

const mockPqUpdate = vi.fn()
const mockPqFindUnique = vi.fn()
const mockPostUpdate = vi.fn()
const mockTransaction = vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[]))

const mockDb = {
  publishingQueue: { update: mockPqUpdate, findUnique: mockPqFindUnique },
  post: { update: mockPostUpdate },
  $transaction: mockTransaction,
} as any

const mockRedis = {} as any

const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function logs(): string[] {
  return stdoutSpy.mock.calls.map(([arg]) => String(arg))
}

describe('publishPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPqUpdate.mockResolvedValue({})
    mockPostUpdate.mockResolvedValue({})
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('BLOG (assisted): marca PROCESSING, NAO chama fetch (rota auto inexistente), loga assisted e conclui DONE', async () => {
    await publishPost('post-1', 'BLOG', mockDb, mockRedis)

    expect(mockPqUpdate).toHaveBeenCalledWith({ where: { postId: 'post-1' }, data: { status: 'PROCESSING' } })
    // Onda3: BLOG virou assistido (auto via fila nao implementado) — sem fetch, sem 404->FAILED.
    expect(mockFetch).not.toHaveBeenCalled()
    expect(logs().some((l) => l.includes('assisted_publish_ready') && l.includes('BLOG'))).toBe(true)
    expect(mockTransaction).toHaveBeenCalled()
    expect(mockPqUpdate).toHaveBeenCalledWith({ where: { postId: 'post-1' }, data: { status: 'DONE' } })
    expect(mockPostUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'post-1' }, data: expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }) }),
    )
    expect(logs().some((l) => l.includes('publishing_done'))).toBe(true)
  })

  it('INSTAGRAM (auto): chama /api/instagram/publish com body { postId }', async () => {
    await publishPost('post-2', 'INSTAGRAM', mockDb, mockRedis)

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/instagram/publish',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ postId: 'post-2' }) }),
    )
  })

  it('LINKEDIN (assisted): NAO chama fetch, loga assisted_publish_ready e conclui DONE', async () => {
    await publishPost('post-3', 'LINKEDIN', mockDb, mockRedis)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(logs().some((l) => l.includes('assisted_publish_ready') && l.includes('LINKEDIN'))).toBe(true)
    expect(mockPqUpdate).toHaveBeenCalledWith({ where: { postId: 'post-3' }, data: { status: 'DONE' } })
  })

  it('canal desconhecido: cai em handleFailure e reagenda PENDING (attempts < max)', async () => {
    mockPqFindUnique.mockResolvedValue({ attempts: 0, maxAttempts: 3 })

    await publishPost('post-4', 'FACEBOOK', mockDb, mockRedis)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockPqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { postId: 'post-4' }, data: expect.objectContaining({ status: 'PENDING', attempts: 1, scheduledAt: expect.any(Date) }) }),
    )
    expect(logs().some((l) => l.includes('publishing_retry_scheduled'))).toBe(true)
  })

  it('fetch !ok no ultimo attempt: marca FAILED definitivo + post FAILED', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' })
    mockPqFindUnique.mockResolvedValue({ attempts: 2, maxAttempts: 3 })

    // INSTAGRAM e canal 'auto' (faz fetch); BLOG virou assistido e nao falharia por fetch.
    await publishPost('post-5', 'INSTAGRAM', mockDb, mockRedis)

    expect(mockPqUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { postId: 'post-5' }, data: expect.objectContaining({ status: 'FAILED', attempts: 3 }) }),
    )
    expect(mockPostUpdate).toHaveBeenCalledWith({ where: { id: 'post-5' }, data: { status: 'FAILED' } })
    expect(logs().some((l) => l.includes('publishing_permanently_failed'))).toBe(true)
  })
})
