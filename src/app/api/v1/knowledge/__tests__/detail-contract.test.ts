import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/** Oracle offline (TASK-032): detalhes knowledge [id] v1 (GET/PATCH/DELETE via services) + cadeia legacy->v1. */
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return { ...actual, requireSession: vi.fn(async () => ({ user: { id: 'op-1', email: 't@t.co' }, response: null })) }
})
vi.mock('@/lib/audit/log', () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseLibraryEntry: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    objection: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    painLibraryEntry: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    solutionPattern: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET as casesGet, PATCH as casesPatch, DELETE as casesDel } from '../cases/[id]/route'
import { GET as objGet } from '../objections/[id]/route'
import { GET as painsGet } from '../pains/[id]/route'
import { GET as patternsGet } from '../patterns/[id]/route'
import { GET as legacyCasesGet, PATCH as legacyCasesPatch, DELETE as legacyCasesDel } from '@/app/api/knowledge/cases/[id]/route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mp = prisma as any
function ctx(id = 'x1') { return { params: Promise.resolve({ id }) } }
function req(method: string, body?: unknown, path = '/api/v1/knowledge/cases/x1'): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}
const LEGACY = '/api/knowledge/cases/x1'
// Body valido para UpdateCaseDto (name min 3): evita 422 mascarar o caminho not-found.
const VALID_PATCH = { name: 'Nome Valido' }

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of ['caseLibraryEntry', 'objection', 'painLibraryEntry', 'solutionPattern']) {
    mp[m].findUnique.mockResolvedValue({ id: 'x1' })
    mp[m].update.mockResolvedValue({ id: 'x1', updated: true })
    mp[m].delete.mockResolvedValue({ id: 'x1' })
  }
})

describe('v1 knowledge cases/[id]', () => {
  it('GET found 200 / not found 404', async () => {
    expect((await casesGet(req('GET'), ctx())).status).toBe(200)
    mp.caseLibraryEntry.findUnique.mockResolvedValueOnce(null)
    expect((await casesGet(req('GET'), ctx('nope'))).status).toBe(404)
  })
  it('PATCH valido 200', async () => {
    const res = await casesPatch(req('PATCH', VALID_PATCH), ctx())
    expect(res.status).toBe(200)
    expect(mp.caseLibraryEntry.update).toHaveBeenCalled()
  })
  it('PATCH valido em id inexistente -> 404', async () => {
    mp.caseLibraryEntry.findUnique.mockResolvedValueOnce(null)
    expect((await casesPatch(req('PATCH', VALID_PATCH), ctx('nope'))).status).toBe(404)
  })
  it('PATCH body invalido (name curto) -> 422', async () => {
    expect((await casesPatch(req('PATCH', { name: 'X' }), ctx())).status).toBe(422)
  })
  it('DELETE 200', async () => {
    const res = await casesDel(req('DELETE'), ctx())
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(mp.caseLibraryEntry.delete).toHaveBeenCalled()
  })
})

describe('v1 {objections,pains,patterns}/[id] GET', () => {
  it('found 200 / not found 404', async () => {
    expect((await objGet(req('GET'), ctx())).status).toBe(200)
    expect((await painsGet(req('GET'), ctx())).status).toBe(200)
    expect((await patternsGet(req('GET'), ctx())).status).toBe(200)
    mp.objection.findUnique.mockResolvedValueOnce(null)
    expect((await objGet(req('GET'), ctx('nope'))).status).toBe(404)
  })
})

describe('legacy cases/[id] shim -> v1', () => {
  it('GET 200 + Deprecation header (Link aponta v1 com o id real)', async () => {
    const g = await legacyCasesGet(req('GET', undefined, LEGACY), ctx())
    expect(g.status).toBe(200)
    expect(g.headers.get('Deprecation')).toBe('true')
    expect(g.headers.get('Link')).toBe('</api/v1/knowledge/cases/x1>; rel="successor-version"')
  })
  it('GET not found -> 404 preservado pelo shim', async () => {
    mp.caseLibraryEntry.findUnique.mockResolvedValueOnce(null)
    const res = await legacyCasesGet(req('GET', undefined, LEGACY), ctx('nope'))
    expect(res.status).toBe(404)
    expect(res.headers.get('Deprecation')).toBe('true')
  })
  it('PATCH 200; DELETE 200 (via shim)', async () => {
    expect((await legacyCasesPatch(req('PATCH', VALID_PATCH, LEGACY), ctx())).status).toBe(200)
    expect((await legacyCasesDel(req('DELETE', undefined, LEGACY), ctx())).status).toBe(200)
  })
})
