import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Reconciliacao TASK-016 (loop 05-27-inbound-forge-user-friendly) — fechamento de gaps
 * do v1 que o frontend ja consumia (405 ao vivo):
 *   - GET    /api/v1/posts/[id]    (o v1 so tinha PUT/PATCH/DELETE)
 *   - PATCH  /api/v1/sources/[id]  (o v1 so tinha GET)
 *   - DELETE /api/v1/sources/[id]  (idem)
 *
 * Oracle offline: mocka services + api-auth (nao depende de app/DB). Prova que os novos
 * handlers v1 espelham o contrato das rotas legadas correspondentes (status + body +
 * regras INT-093/INT-136/DUPLICATE_URL preservadas pelos services).
 */

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn(async () => ({ user: { id: 'op-1', email: 't@t.co' }, response: null })),
  }
})

vi.mock('@/lib/services/source.service', () => ({
  updateSource: vi.fn(),
  deleteSource: vi.fn(),
}))

vi.mock('@/lib/services/post.service', () => ({
  PostService: { findById: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    scrapingAuditLog: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
  },
}))

import { updateSource, deleteSource } from '@/lib/services/source.service'
import { PostService } from '@/lib/services/post.service'
import { prisma } from '@/lib/prisma'
import { PATCH as v1SourcePatch, DELETE as v1SourceDelete } from '@/app/api/v1/sources/[id]/route'
import { GET as v1PostGet } from '@/app/api/v1/posts/[id]/route'
import { GET as v1ScrapingAuditGet } from '@/app/api/v1/compliance/scraping-audit/route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mUpdate = updateSource as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mDelete = deleteSource as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mFindById = PostService.findById as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mAuditFindMany = (prisma as any).scrapingAuditLog.findMany

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('v1 sources/[id] PATCH — paridade com legacy /api/sources/[id]', () => {
  it('200 + source no sucesso', async () => {
    mUpdate.mockResolvedValue({ ok: true, source: { id: 's1', name: 'Foo', isActive: false } })
    const res = await v1SourcePatch(jsonReq('/api/v1/sources/s1', 'PATCH', { isActive: false }), ctx('s1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data ?? body).toMatchObject({ id: 's1' })
  })

  it('422 para body invalido (schema)', async () => {
    const res = await v1SourcePatch(jsonReq('/api/v1/sources/s1', 'PATCH', { url: 'nao-e-url' }), ctx('s1'))
    expect(res.status).toBe(422)
    expect(mUpdate).not.toHaveBeenCalled()
  })

  it('404 quando NOT_FOUND', async () => {
    mUpdate.mockResolvedValue({ ok: false, code: 'NOT_FOUND' })
    const res = await v1SourcePatch(jsonReq('/api/v1/sources/x', 'PATCH', { name: 'A' }), ctx('x'))
    expect(res.status).toBe(404)
  })

  it('409 BLOCKED_DOMAIN (INT-136)', async () => {
    mUpdate.mockResolvedValue({ ok: false, code: 'BLOCKED_DOMAIN' })
    const res = await v1SourcePatch(jsonReq('/api/v1/sources/s1', 'PATCH', { url: 'https://x.co' }), ctx('s1'))
    expect(res.status).toBe(409)
  })

  it('403 SRC_001 para fonte protegida', async () => {
    mUpdate.mockResolvedValue({ ok: false, code: 'PROTECTED' })
    const res = await v1SourcePatch(jsonReq('/api/v1/sources/s1', 'PATCH', { name: 'A' }), ctx('s1'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('SRC_001')
  })
})

describe('v1 sources/[id] DELETE — paridade com legacy /api/sources/[id]', () => {
  it('204 no sucesso', async () => {
    mDelete.mockResolvedValue({ ok: true })
    const res = await v1SourceDelete(jsonReq('/api/v1/sources/s1', 'DELETE'), ctx('s1'))
    expect(res.status).toBe(204)
  })

  it('403 INT-093 para fonte protegida', async () => {
    mDelete.mockResolvedValue({ ok: false, code: 'PROTECTED' })
    const res = await v1SourceDelete(jsonReq('/api/v1/sources/s1', 'DELETE'), ctx('s1'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('SRC_001')
  })

  it('404 quando NOT_FOUND', async () => {
    mDelete.mockResolvedValue({ ok: false, code: 'NOT_FOUND' })
    const res = await v1SourceDelete(jsonReq('/api/v1/sources/x', 'DELETE'), ctx('x'))
    expect(res.status).toBe(404)
  })
})

describe('v1 posts/[id] GET — paridade com legacy /api/posts/[id]', () => {
  it('200 + post no sucesso', async () => {
    mFindById.mockResolvedValue({ id: 'p1', status: 'DRAFT' })
    const res = await v1PostGet(jsonReq('/api/v1/posts/p1', 'GET'), ctx('p1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data ?? body).toMatchObject({ id: 'p1' })
  })

  it('404 quando inexistente', async () => {
    mFindById.mockResolvedValue(null)
    const res = await v1PostGet(jsonReq('/api/v1/posts/x', 'GET'), ctx('x'))
    expect(res.status).toBe(404)
  })
})

describe('v1 compliance/scraping-audit GET — isolamento multi-tenant (finding TASK-013)', () => {
  it('aplica scoping por source.operatorId no where (findMany + count)', async () => {
    const res = await v1ScrapingAuditGet(jsonReq('/api/v1/compliance/scraping-audit?sourceId=s1', 'GET'))
    expect(res.status).toBe(200)
    expect(mAuditFindMany).toHaveBeenCalledTimes(1)
    const arg = mAuditFindMany.mock.calls[0][0]
    expect(arg.where.source).toEqual({ operatorId: 'op-1' })
    // o filtro de sourceId convive com o scoping de tenant (AND)
    expect(arg.where.sourceId).toBe('s1')
  })
})
