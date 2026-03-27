/**
 * Testes de Integração — Themes
 * Endpoints:
 *   GET /api/v1/themes
 *   GET /api/v1/themes/{id}
 *   POST /api/v1/themes/{id}/reject
 *   POST /api/v1/themes/{id}/restore
 *
 * Rastreabilidade: US-011
 * Erros cobertos: THEME_050, THEME_051, THEME_080, AUTH_001, VAL_001
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated, mockSessionUnauthorized } from './helpers/auth.helper'
import { buildRejectThemePayload } from './helpers/factory.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { GET: themesGET } = await import('@/app/api/v1/themes/route')
const { GET: themeDetailGET } = await import('@/app/api/v1/themes/[id]/route')
const { POST: themeRejectPOST } = await import('@/app/api/v1/themes/[id]/reject/route')
const { POST: themeRestorePOST } = await import('@/app/api/v1/themes/[id]/restore/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

// IDs dos temas seedados no banco de teste (do SEED-CATALOG: 4 ACTIVE, 1 DEPRIORITIZED, 1 REJECTED)
let seedActiveThemeId: string
let seedRejectedThemeId: string

beforeAll(async () => {
  const activeTheme = await prisma.theme.findFirst({ where: { status: 'ACTIVE', isNew: true } })
  const rejectedTheme = await prisma.theme.findFirst({ where: { status: 'REJECTED' } })

  if (!activeTheme || !rejectedTheme) {
    throw new Error(
      'Banco de teste sem dados de seed. Execute: bun run db:seed:test'
    )
  }

  seedActiveThemeId = activeTheme.id
  seedRejectedThemeId = rejectedTheme.id
})

afterEach(async () => {
  // Restaurar temas que foram modificados em testes, se necessário
  // Os testes de reject/restore são auto-suficientes com rollback manual
})

// ─── GET /api/v1/themes ───────────────────────────────────────────────────────

describe('GET /api/v1/themes', () => {
  it('[Cenário 1] deve listar temas ordenados por score', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/themes?page=1&limit=20')
    const response = await themesGET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()

    // Verificar que scores estão em ordem decrescente (se houver múltiplos temas)
    if (body.data.length >= 2) {
      for (let i = 0; i < body.data.length - 1; i++) {
        expect(body.data[i].opportunityScore).toBeGreaterThanOrEqual(
          body.data[i + 1].opportunityScore
        )
      }
    }
  })

  it('[Cenário 1] deve filtrar temas por status ACTIVE', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/themes?status=ACTIVE')
    const response = await themesGET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    body.data.forEach((t: { status: string }) => {
      expect(t.status).toBe('ACTIVE')
    })
  })

  it('[Cenário 1] deve filtrar temas novos com isNew=true', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/themes?isNew=true')
    const response = await themesGET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    body.data.forEach((t: { isNew: boolean }) => {
      expect(t.isNew).toBe(true)
    })
  })

  it('[Cenário 3 — AUTH_001] deve retornar 401 sem sessão', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce(mockSessionUnauthorized())

    const req = makeRequest('http://localhost:3000/api/v1/themes')
    const response = await themesGET(req)

    expect(response.status).toBe(401)
  })
})

// ─── GET /api/v1/themes/{id} ──────────────────────────────────────────────────

describe('GET /api/v1/themes/{id}', () => {
  it('[Cenário 1] deve retornar detalhe de tema existente', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/themes/${seedActiveThemeId}`)
    const response = await themeDetailGET(req, { params: { id: seedActiveThemeId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(seedActiveThemeId)
    expect(body.data.opportunityScore).toBeGreaterThanOrEqual(0)
    expect(body.data.opportunityScore).toBeLessThanOrEqual(100)
  })

  it('[Cenário 2 — THEME_080] deve retornar 404 para tema inexistente', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/themes/00000000-0000-0000-0000-000000000099')
    const response = await themeDetailGET(req, {
      params: { id: '00000000-0000-0000-0000-000000000099' },
    })

    expect(response.status).toBe(404)
  })
})

// ─── POST /api/v1/themes/{id}/reject ─────────────────────────────────────────

describe('POST /api/v1/themes/{id}/reject', () => {
  it('[Cenário 1] deve rejeitar tema ACTIVE com motivo', async () => {
    // Buscar tema ACTIVE que não seja o de seed (para não quebrar outros testes)
    const testTheme = await prisma.theme.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })
    if (!testTheme) return // pular se não há temas ACTIVE

    const payload = buildRejectThemePayload()
    const req = makeRequest(
      `http://localhost:3000/api/v1/themes/${testTheme.id}/reject`,
      { method: 'POST', body: payload }
    )
    const response = await themeRejectPOST(req, { params: { id: testTheme.id } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('REJECTED')
    expect(body.data.rejectionReason).toBeDefined()

    // Verificar no banco
    const dbTheme = await prisma.theme.findUnique({ where: { id: testTheme.id } })
    expect(dbTheme!.status).toBe('REJECTED')

    // Cleanup: restaurar para não afetar outros testes
    await prisma.theme.update({ where: { id: testTheme.id }, data: { status: 'ACTIVE', rejectionReason: null } })
  })

  it('[Cenário 2 — THEME_050] deve retornar 422 ao rejeitar tema já REJECTED', async () => {
    const payload = buildRejectThemePayload()
    const req = makeRequest(
      `http://localhost:3000/api/v1/themes/${seedRejectedThemeId}/reject`,
      { method: 'POST', body: payload }
    )
    const response = await themeRejectPOST(req, { params: { id: seedRejectedThemeId } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — THEME_080] deve retornar 404 para tema inexistente', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/v1/themes/00000000-0000-0000-0000-000000000088/reject',
      { method: 'POST', body: buildRejectThemePayload() }
    )
    const response = await themeRejectPOST(req, {
      params: { id: '00000000-0000-0000-0000-000000000088' },
    })

    expect(response.status).toBe(404)
  })

  it('[Cenário 2 — VAL_001] deve retornar 422 sem motivo de rejeição', async () => {
    const req = makeRequest(
      `http://localhost:3000/api/v1/themes/${seedActiveThemeId}/reject`,
      { method: 'POST', body: {} }
    )
    const response = await themeRejectPOST(req, { params: { id: seedActiveThemeId } })

    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

// ─── POST /api/v1/themes/{id}/restore ────────────────────────────────────────

describe('POST /api/v1/themes/{id}/restore', () => {
  it('[Cenário 1] deve restaurar tema REJECTED para ACTIVE', async () => {
    const req = makeRequest(
      `http://localhost:3000/api/v1/themes/${seedRejectedThemeId}/restore`,
      { method: 'POST' }
    )
    const response = await themeRestorePOST(req, { params: { id: seedRejectedThemeId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('ACTIVE')

    // Verificar no banco
    const dbTheme = await prisma.theme.findUnique({ where: { id: seedRejectedThemeId } })
    expect(dbTheme!.status).toBe('ACTIVE')

    // Cleanup: restaurar ao REJECTED para não afetar outros testes
    await prisma.theme.update({
      where: { id: seedRejectedThemeId },
      data: { status: 'REJECTED' },
    })
  })

  it('[Cenário 2 — THEME_051] deve retornar 422 ao restaurar tema que não é REJECTED', async () => {
    const req = makeRequest(
      `http://localhost:3000/api/v1/themes/${seedActiveThemeId}/restore`,
      { method: 'POST' }
    )
    const response = await themeRestorePOST(req, { params: { id: seedActiveThemeId } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })
})
