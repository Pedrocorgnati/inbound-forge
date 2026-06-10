import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Oracle offline (TASK-031): contrato das colecoes knowledge no v1 reconciliado +
 * cadeia legacy->v1->service. Mocka prisma + sessao + audit (sem app/DB).
 */
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return { ...actual, requireSession: vi.fn(async () => ({ user: { id: 'op-1', email: 't@t.co' }, response: null })) }
})
vi.mock('@/lib/audit/log', () => ({ logAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseLibraryEntry: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    objection: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    painLibraryEntry: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    solutionPattern: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET as casesGet, POST as casesPost } from '../cases/route'
import { GET as objGet, POST as objPost } from '../objections/route'
import { GET as painsGet, POST as painsPost } from '../pains/route'
import { GET as patternsGet, POST as patternsPost } from '../patterns/route'
import { GET as legacyCasesGet, POST as legacyCasesPost } from '@/app/api/knowledge/cases/route'
import { GET as legacyObjGet } from '@/app/api/knowledge/objections/route'
import { GET as legacyPainsGet } from '@/app/api/knowledge/pains/route'
import { GET as legacyPatternsGet, POST as legacyPatternsPost } from '@/app/api/knowledge/patterns/route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mp = prisma as any
const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

function req(url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of ['caseLibraryEntry', 'objection', 'painLibraryEntry', 'solutionPattern']) {
    mp[m].findMany.mockResolvedValue([])
    mp[m].count.mockResolvedValue(0)
    if (mp[m].create) mp[m].create.mockResolvedValue({ id: 'new-id' })
    if (mp[m].findUnique) mp[m].findUnique.mockResolvedValue({ id: 'exists' })
  }
})

describe('v1 knowledge collections', () => {
  it('cases GET 200', async () => {
    const res = await casesGet(req('/api/v1/knowledge/cases'))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(mp.caseLibraryEntry.findMany).toHaveBeenCalled()
  })
  it('cases GET limit>100 -> 422', async () => {
    expect((await casesGet(req('/api/v1/knowledge/cases?limit=200'))).status).toBe(422)
  })
  it('cases POST valido -> 201', async () => {
    const res = await casesPost(req('/api/v1/knowledge/cases', {
      name: 'Case X', sector: 'Tech', systemType: 'CRM',
      outcome: 'O cliente triplicou as vendas em tres meses com automacao completa de follow-up.',
      hasQuantifiableResult: true, isDraft: true,
    }))
    expect(res.status).toBe(201)
  })
  it('cases POST invalido -> 422', async () => {
    expect((await casesPost(req('/api/v1/knowledge/cases', { sector: 'T' }))).status).toBe(422)
  })
  it('objections GET 200 / POST 201 / POST invalido 422', async () => {
    expect((await objGet(req('/api/v1/knowledge/objections'))).status).toBe(200)
    expect((await objPost(req('/api/v1/knowledge/objections', { content: 'Demora muito', type: 'TIMING' }))).status).toBe(201)
    expect((await objPost(req('/api/v1/knowledge/objections', { content: 'ab', type: 'PRICE' }))).status).toBe(422)
  })
  it('pains GET 200 / POST 201', async () => {
    expect((await painsGet(req('/api/v1/knowledge/pains'))).status).toBe(200)
    expect((await painsPost(req('/api/v1/knowledge/pains', { title: 'Dor X', description: 'Descricao detalhada da dor.', sectors: ['saude'] }))).status).toBe(201)
  })
  it('patterns GET 200 / POST sem painId 422 / painId inexistente 403', async () => {
    expect((await patternsGet(req('/api/v1/knowledge/patterns'))).status).toBe(200)
    expect((await patternsPost(req('/api/v1/knowledge/patterns', { name: 'Pat', description: 'Descricao do padrao.' }))).status).toBe(422)
    mp.painLibraryEntry.findUnique.mockResolvedValueOnce(null)
    const res = await patternsPost(req('/api/v1/knowledge/patterns', { name: 'Pat', description: 'Descricao do padrao.', painId: UUID_A, caseId: UUID_B }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('KNOWLEDGE_020')
  })
})

describe('legacy collection shims -> v1 (proxy + depreciacao)', () => {
  it('cases GET 200 + headers', async () => {
    const res = await legacyCasesGet(req('/api/knowledge/cases'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Deprecation')).toBe('true')
    expect(res.headers.get('Sunset')).toBeTruthy()
    expect(res.headers.get('Link')).toContain('/api/v1/knowledge/cases')
  })
  it('cases GET limit>100 -> 422 preservado', async () => {
    const res = await legacyCasesGet(req('/api/knowledge/cases?limit=200'))
    expect(res.status).toBe(422)
    expect(res.headers.get('Deprecation')).toBe('true')
  })
  it('cases POST 201; obj/pains GET 200', async () => {
    const res = await legacyCasesPost(req('/api/knowledge/cases', {
      name: 'Case X', sector: 'Tech', systemType: 'CRM',
      outcome: 'O cliente triplicou as vendas em tres meses com automacao completa de follow-up.',
      hasQuantifiableResult: true, isDraft: true,
    }))
    expect(res.status).toBe(201)
    expect((await legacyObjGet(req('/api/knowledge/objections'))).status).toBe(200)
    expect((await legacyPainsGet(req('/api/knowledge/pains'))).status).toBe(200)
  })
  it('patterns GET 200; POST painId inexistente -> 403 KNOWLEDGE_020 preservado', async () => {
    expect((await legacyPatternsGet(req('/api/knowledge/patterns'))).status).toBe(200)
    mp.painLibraryEntry.findUnique.mockResolvedValueOnce(null)
    const res = await legacyPatternsPost(req('/api/knowledge/patterns', { name: 'Pat', description: 'Descricao do padrao.', painId: UUID_A, caseId: UUID_B }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('KNOWLEDGE_020')
    expect(res.headers.get('Deprecation')).toBe('true')
  })
})
