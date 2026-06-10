import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

/**
 * TASK-016/030+ — guarda da depreciacao da allowlist.
 * SHIMADAS (clusters 1-2, knowledge): reconciliadas com v1 e deprecadas via proxy;
 *   paridade validada aqui (payload) + src/app/api/v1/knowledge/__tests__/{collections,detail}-contract.test.ts.
 * PENDENTE (clusters 3-5, posts/sources/compliance): divergem do v1 (endpoints distintos
 *   com consumidores em ambos os lados) -> standalone. Ver MAP.md secao "Pendencias".
 *
 * Este arquivo cobre dois eixos do criterio de aceite:
 *   (A) Guarda ESTRUTURAL: SHIMADA delega ao v1 + usa deprecation-shim; PENDENTE standalone.
 *   (B) Paridade de PAYLOAD: para as 4 colecoes knowledge shimadas, a resposta legada
 *       (status + body) e identica a v1 (o proxy nao muta o payload), com headers de
 *       depreciacao anexados. Detalhe das rotas de id coberto em detail-contract.test.ts.
 */

// ---------------------------------------------------------------------------
// (A) Guarda estrutural (sem mocks; le o source)
// ---------------------------------------------------------------------------
const ROOT = process.cwd()
const SHIMADAS = [
  'knowledge/cases', 'knowledge/objections', 'knowledge/pains', 'knowledge/patterns',
  'knowledge/cases/[id]', 'knowledge/objections/[id]', 'knowledge/pains/[id]', 'knowledge/patterns/[id]',
]
const PENDENTE_RECONCILIACAO = [
  'compliance/scraping-audit', 'posts', 'posts/[id]', 'posts/[id]/approve', 'sources/[id]',
]
function readLegacyRoute(rel: string): string {
  return readFileSync(join(ROOT, 'src/app/api', rel, 'route.ts'), 'utf8')
}
describe('legacy API — guarda estrutural da depreciacao (TASK-016/030+)', () => {
  it.each(SHIMADAS)('%s: SHIMADA — delega ao twin v1 via deprecation-shim', (path) => {
    const src = readLegacyRoute(path)
    expect(src).toContain(`from '@/app/api/v1/${path}/route'`)
    expect(src).toContain("from '@/lib/deprecation-shim'")
    expect(src).toContain('proxyToV1')
  })
  it.each(PENDENTE_RECONCILIACAO)('%s: PENDENTE — standalone (nao shimada)', (path) => {
    const src = readLegacyRoute(path)
    expect(src).not.toContain(`from '@/app/api/v1/${path}/route'`)
    expect(src).not.toContain("from '@/lib/deprecation-shim'")
  })
  it('helper de shim presente', () => {
    const helper = readFileSync(join(ROOT, 'src/lib/deprecation-shim.ts'), 'utf8')
    expect(helper).toContain('export async function proxyToV1')
    expect(helper).toContain('export const LEGACY_SUNSET')
  })
})

// ---------------------------------------------------------------------------
// (B) Paridade de PAYLOAD legacy vs v1 (oracle offline: mocka prisma/api-auth)
// ---------------------------------------------------------------------------
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn(async () => ({ user: { id: 'op-1', email: 't@t.co' }, response: null })),
  }
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
import { GET as v1CasesGet } from '@/app/api/v1/knowledge/cases/route'
import { GET as v1ObjGet } from '@/app/api/v1/knowledge/objections/route'
import { GET as v1PainsGet } from '@/app/api/v1/knowledge/pains/route'
import { GET as v1PatternsGet } from '@/app/api/v1/knowledge/patterns/route'
import { GET as legacyCasesGet } from '@/app/api/knowledge/cases/route'
import { GET as legacyObjGet } from '@/app/api/knowledge/objections/route'
import { GET as legacyPainsGet } from '@/app/api/knowledge/pains/route'
import { GET as legacyPatternsGet } from '@/app/api/knowledge/patterns/route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mp = prisma as any

function reqGet(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of ['caseLibraryEntry', 'objection', 'painLibraryEntry', 'solutionPattern']) {
    mp[m].findMany.mockResolvedValue([])
    mp[m].count.mockResolvedValue(0)
    if (mp[m].findUnique) mp[m].findUnique.mockResolvedValue({ id: 'exists' })
  }
})

const COLLECTIONS: Array<{
  name: string
  path: string
  v1: (r: NextRequest) => Promise<Response> | Response
  legacy: (r: NextRequest) => Promise<Response> | Response
}> = [
  { name: 'knowledge/cases', path: '/api/knowledge/cases', v1: v1CasesGet, legacy: legacyCasesGet },
  { name: 'knowledge/objections', path: '/api/knowledge/objections', v1: v1ObjGet, legacy: legacyObjGet },
  { name: 'knowledge/pains', path: '/api/knowledge/pains', v1: v1PainsGet, legacy: legacyPainsGet },
  { name: 'knowledge/patterns', path: '/api/knowledge/patterns', v1: v1PatternsGet, legacy: legacyPatternsGet },
]

describe('legacy API — paridade de payload legacy vs v1 (GET colecoes shimadas)', () => {
  it.each(COLLECTIONS)('$name: mesmo status + mesmo body + headers de depreciacao', async ({ path, v1, legacy }) => {
    const v1Path = path.replace(/^\/api\//, '/api/v1/')
    const v1Res = await v1(reqGet(v1Path))
    const legacyRes = await legacy(reqGet(path))

    // Paridade de status
    expect(legacyRes.status).toBe(v1Res.status)
    expect(legacyRes.status).toBe(200)

    // Paridade de body (proxy nao muta o payload)
    expect(await legacyRes.json()).toEqual(await v1Res.json())

    // A rota legada anexa os headers de depreciacao; a v1 nao
    expect(legacyRes.headers.get('Deprecation')).toBe('true')
    expect(legacyRes.headers.get('Sunset')).toBeTruthy()
    expect(legacyRes.headers.get('Link')).toContain(v1Path)
    expect(v1Res.headers.get('Deprecation')).toBeNull()
  })
})
