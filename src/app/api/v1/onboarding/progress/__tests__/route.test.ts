import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-auth', () => ({
  requireSession: vi.fn(),
  badRequest: (msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 400 }),
  internalError: () =>
    new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 }),
  validationError: (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Dados de entrada inválidos'
    return new Response(JSON.stringify({ success: false, error: message, issues: (error as Record<string, unknown>)?.issues }), { status: 422 })
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseLibraryEntry: { count: vi.fn() },
    painLibraryEntry: { count: vi.fn() },
    solutionPattern: { count: vi.fn() },
    $executeRaw: vi.fn(),
  },
}))

vi.mock('@/schemas/health.schema', () => ({
  OnboardingProgressPatchSchema: {
    safeParse: vi.fn((body: unknown) => {
      if (!(body as Record<string, unknown>).completed) {
        return { success: false, error: new Error('VAL_001') }
      }
      return { success: true, data: body }
    }),
  },
}))

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import { GET, PATCH } from '../route'
import { requireSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { OnboardingProgressPatchSchema } from '@/schemas/health.schema'
import { ZodError } from 'zod'

const mockRequireSession = requireSession as ReturnType<typeof vi.fn>
const mockCasesCount = prisma.caseLibraryEntry.count as ReturnType<typeof vi.fn>
const mockPainsCount = prisma.painLibraryEntry.count as ReturnType<typeof vi.fn>
const mockSolutionsCount = prisma.solutionPattern.count as ReturnType<typeof vi.fn>
const mockExecuteRaw = prisma.$executeRaw as unknown as ReturnType<typeof vi.fn>
const mockSchemaSafeParse = (OnboardingProgressPatchSchema as { safeParse: ReturnType<typeof vi.fn> }).safeParse

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authedSession(userId = 'user-123', email = 'test@example.com') {
  mockRequireSession.mockResolvedValue({
    user: { id: userId, email },
    response: null,
  })
}

function unauthSession() {
  mockRequireSession.mockResolvedValue({
    user: null,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  })
}

function buildPatchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/onboarding/progress', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── GET Tests ────────────────────────────────────────────────────────────────

describe('GET /api/v1/onboarding/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authedSession()
  })

  it('retorna 401 quando não autenticado', async () => {
    unauthSession()
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna contagens corretamente', async () => {
    mockCasesCount.mockResolvedValue(5)
    mockPainsCount.mockResolvedValue(3)
    mockSolutionsCount.mockResolvedValue(7)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.counts).toEqual({ cases: 5, pains: 3, solutions: 7 })
  })

  it('retorna 500 em erro de banco', async () => {
    mockCasesCount.mockRejectedValue(new Error('DB error'))
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('retorna contagens zeradas quando base está vazia', async () => {
    mockCasesCount.mockResolvedValue(0)
    mockPainsCount.mockResolvedValue(0)
    mockSolutionsCount.mockResolvedValue(0)

    const res = await GET()
    const body = await res.json()
    expect(body.counts).toEqual({ cases: 0, pains: 0, solutions: 0 })
  })
})

// ─── PATCH Tests ──────────────────────────────────────────────────────────────

describe('PATCH /api/v1/onboarding/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authedSession()
    mockExecuteRaw.mockResolvedValue(undefined)
    mockSchemaSafeParse.mockImplementation((body: unknown) => ({ success: true, data: body }))
  })

  it('retorna 401 quando não autenticado', async () => {
    unauthSession()
    const res = await PATCH(buildPatchRequest({ completed: true }))
    expect(res.status).toBe(401)
  })

  it('retorna 422 com corpo JSON inválido', async () => {
    const req = new NextRequest('http://localhost/api/v1/onboarding/progress', {
      method: 'PATCH',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(422)
  })

  it('retorna 422 em falha de validação Zod', async () => {
    const zodError = new ZodError([
      { code: 'invalid_type', expected: 'boolean', received: 'undefined', path: ['completed'], message: 'Required' },
    ])
    mockSchemaSafeParse.mockReturnValueOnce({ success: false, error: zodError })

    const res = await PATCH(buildPatchRequest({ completed: false }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.issues).toBeDefined()
  })

  it('retorna ok:true em sucesso', async () => {
    const res = await PATCH(buildPatchRequest({ completed: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('seta cookie inbound_forge_onboarded=1 em sucesso', async () => {
    const res = await PATCH(buildPatchRequest({ completed: true }))
    const setCookieHeader = res.headers.get('set-cookie')
    expect(setCookieHeader).toContain('inbound_forge_onboarded=1')
  })

  it('executa upsert no banco em sucesso', async () => {
    await PATCH(buildPatchRequest({ completed: true }))
    expect(mockExecuteRaw).toHaveBeenCalledOnce()
  })

  it('retorna 500 em erro de banco', async () => {
    mockExecuteRaw.mockRejectedValue(new Error('DB error'))
    const res = await PATCH(buildPatchRequest({ completed: true }))
    expect(res.status).toBe(500)
  })
})
