/**
 * Testes de Integração — Knowledge Threshold Gate (TST-007 / RN-005)
 *
 * Cobre: GET /api/v1/knowledge/threshold
 * Regra de negócio: motor desbloqueado apenas com 5 cases + 5 pains validados.
 * Rastreabilidade: TASK-7/ST004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockSessionAuthenticated } from './helpers/auth.helper'

// Mocks de session e Prisma — antes dos imports das rotas
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const prismaMock = {
  caseLibraryEntry: { count: vi.fn() },
  painLibraryEntry: { count: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

const { GET: thresholdGET } = await import('@/app/api/v1/knowledge/threshold/route')

function makeRequest(): NextRequest {
  return new NextRequest(
    new URL('http://localhost:3000/api/v1/knowledge/threshold'),
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  )
}

describe('Knowledge Threshold Gate (TST-007 / RN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Sucesso ─────────────────────────────────────────────────────────────

  it('[SUCCESS] 5 cases + 5 pains validados → motorUnlocked: true', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(5)
    prismaMock.painLibraryEntry.count.mockResolvedValue(5)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.motorUnlocked).toBe(true)
    expect(body.data.cases.met).toBe(true)
    expect(body.data.pains.met).toBe(true)
  })

  it('[SUCCESS] GET /api/v1/knowledge/threshold retorna contagem e required corretos', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(7)
    prismaMock.painLibraryEntry.count.mockResolvedValue(6)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.cases.validated).toBe(7)
    expect(body.data.cases.required).toBe(5)
    expect(body.data.cases.met).toBe(true)
    expect(body.data.pains.validated).toBe(6)
    expect(body.data.pains.required).toBe(5)
    expect(body.data.pains.met).toBe(true)
    expect(body.data.motorUnlocked).toBe(true)
  })

  // ─── Edge cases — regra AND estrita ──────────────────────────────────────

  it('[EDGE] 4 cases + 5 pains → motorUnlocked: false (insuficiente no cases)', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(4)
    prismaMock.painLibraryEntry.count.mockResolvedValue(5)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(body.data.motorUnlocked).toBe(false)
    expect(body.data.cases.met).toBe(false)
    expect(body.data.pains.met).toBe(true)
  })

  it('[EDGE] 5 cases + 4 pains → motorUnlocked: false (insuficiente no pains)', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(5)
    prismaMock.painLibraryEntry.count.mockResolvedValue(4)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(body.data.motorUnlocked).toBe(false)
    expect(body.data.cases.met).toBe(true)
    expect(body.data.pains.met).toBe(false)
  })

  it('[EDGE] 0 cases + 0 pains → motorUnlocked: false', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(0)
    prismaMock.painLibraryEntry.count.mockResolvedValue(0)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(body.data.motorUnlocked).toBe(false)
    expect(body.data.cases.validated).toBe(0)
    expect(body.data.pains.validated).toBe(0)
  })

  it('[EDGE] exatamente no limite (5+5) → motorUnlocked: true (inclusivo)', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(5)
    prismaMock.painLibraryEntry.count.mockResolvedValue(5)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    expect(body.data.motorUnlocked).toBe(true)
  })

  // ─── Autenticação ─────────────────────────────────────────────────────────

  it('[ERROR] 401 sem sessão → não retorna dados do threshold', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: null,
      response: new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401 }
      ) as any,
    })

    const response = await thresholdGET(makeRequest())

    expect(response.status).toBe(401)
    // Dados de threshold não devem ser retornados sem autenticação
    const body = await response.json()
    expect(body.data).toBeUndefined()
  })

  // ─── Estrutura da resposta ────────────────────────────────────────────────

  it('[SUCCESS] estrutura de resposta completa: cases, pains, motorUnlocked', async () => {
    prismaMock.caseLibraryEntry.count.mockResolvedValue(5)
    prismaMock.painLibraryEntry.count.mockResolvedValue(5)

    const response = await thresholdGET(makeRequest())
    const body = await response.json()

    // Estrutura esperada
    expect(body.data).toHaveProperty('cases')
    expect(body.data).toHaveProperty('pains')
    expect(body.data).toHaveProperty('motorUnlocked')
    expect(body.data.cases).toHaveProperty('validated')
    expect(body.data.cases).toHaveProperty('required')
    expect(body.data.cases).toHaveProperty('met')
    expect(body.data.pains).toHaveProperty('validated')
    expect(body.data.pains).toHaveProperty('required')
    expect(body.data.pains).toHaveProperty('met')
  })
})
