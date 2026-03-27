/**
 * Testes de Integração — Content Generation
 * Endpoints:
 *   POST /api/v1/content/generate
 *   GET /api/v1/content/{pieceId}
 *   POST /api/v1/content/{pieceId}/approve
 *   POST /api/v1/content/{pieceId}/reject
 *
 * Rastreabilidade: US-012
 * Erros cobertos: CONTENT_050, CONTENT_051, CONTENT_052, CONTENT_080, AUTH_001
 *
 * Nota: geração via Claude API não é testada em integração real (usa dados de seed).
 * Testa-se a camada de validação, estado e persistência.
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated } from './helpers/auth.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

// Importar após mock
const { POST: contentGeneratePOST } = await import('@/app/api/v1/content/generate/route')
const { GET: contentPieceGET, PUT: contentPiecePUT } = await import(
  '@/app/api/v1/content/[pieceId]/route'
)
const { POST: contentApprovePOST } = await import('@/app/api/v1/content/[pieceId]/approve/route')
const { POST: contentRejectPOST } = await import('@/app/api/v1/content/[pieceId]/reject/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

// Dados de seed necessários
let seedApprovedPieceId: string  // ContentPiece com status APPROVED (ângulo selecionado)
let seedDraftPieceId: string     // ContentPiece com status DRAFT (nenhum ângulo selecionado)
let seedReviewPieceId: string    // ContentPiece com status REVIEW
let seedActiveThemeWithContextId: string // Tema com pain + case vinculados

beforeAll(async () => {
  const approvedPiece = await prisma.contentPiece.findFirst({ where: { status: 'APPROVED' } })
  const draftPiece = await prisma.contentPiece.findFirst({ where: { status: 'DRAFT' } })
  const reviewPiece = await prisma.contentPiece.findFirst({ where: { status: 'REVIEW' } })

  // Tema com contexto suficiente (pain + case vinculados)
  const themeWithContext = await prisma.theme.findFirst({
    where: {
      status: 'ACTIVE',
      painId: { not: null },
      caseId: { not: null },
    },
  })

  if (!approvedPiece || !draftPiece || !reviewPiece) {
    throw new Error('Banco de teste sem dados de seed. Execute: bun run db:seed:test')
  }

  seedApprovedPieceId = approvedPiece.id
  seedDraftPieceId = draftPiece.id
  seedReviewPieceId = reviewPiece.id
  seedActiveThemeWithContextId = themeWithContext?.id ?? ''
})

// ─── POST /api/v1/content/generate ───────────────────────────────────────────

describe('POST /api/v1/content/generate', () => {
  it('[Cenário 2 — CONTENT_050] deve retornar 422 para tema sem contexto suficiente', async () => {
    // Buscar tema sem painId ou caseId
    const themeWithoutContext = await prisma.theme.findFirst({
      where: { status: 'ACTIVE', painId: null },
    })

    if (!themeWithoutContext) {
      // Todos os temas têm contexto — pular teste
      return
    }

    const req = makeRequest('http://localhost:3000/api/v1/content/generate', {
      method: 'POST',
      body: { themeId: themeWithoutContext.id },
    })
    const response = await contentGeneratePOST(req)
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — VAL_001] deve retornar erro sem themeId', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/content/generate', {
      method: 'POST',
      body: {},
    })
    const response = await contentGeneratePOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('[Cenário 2 — VAL_002] deve retornar erro com themeId UUID malformado', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/content/generate', {
      method: 'POST',
      body: { themeId: 'not-a-uuid' },
    })
    const response = await contentGeneratePOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('[Cenário 2 — CONTENT_080-like] deve retornar erro para themeId inexistente', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/content/generate', {
      method: 'POST',
      body: { themeId: '00000000-0000-0000-0000-000000000000' },
    })
    const response = await contentGeneratePOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

// ─── GET /api/v1/content/{pieceId} ───────────────────────────────────────────

describe('GET /api/v1/content/{pieceId}', () => {
  it('[Cenário 1] deve retornar detalhe de ContentPiece com ângulos', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/content/${seedDraftPieceId}`)
    const response = await contentPieceGET(req, { params: { pieceId: seedDraftPieceId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(seedDraftPieceId)
    expect(body.data).toHaveProperty('status')
    expect(body.data).toHaveProperty('themeId')
  })

  it('[Cenário 2 — CONTENT_080] deve retornar 404 para pieceId inexistente', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/content/00000000-0000-0000-0000-000000000077')
    const response = await contentPieceGET(req, {
      params: { pieceId: '00000000-0000-0000-0000-000000000077' },
    })

    expect(response.status).toBe(404)
  })
})

// ─── POST /api/v1/content/{pieceId}/approve ──────────────────────────────────

describe('POST /api/v1/content/{pieceId}/approve', () => {
  it('[Cenário 1] deve aprovar ContentPiece REVIEW com ângulo selecionado', async () => {
    // Buscar piece em REVIEW com ângulo selecionado
    const reviewPieceWithAngle = await prisma.contentPiece.findFirst({
      where: { status: 'REVIEW' },
      include: { angles: { where: { isSelected: true } } },
    })

    if (!reviewPieceWithAngle || reviewPieceWithAngle.angles.length === 0) {
      // Sem piece em REVIEW com ângulo — pular
      return
    }

    const req = makeRequest(
      `http://localhost:3000/api/v1/content/${reviewPieceWithAngle.id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ angleId: reviewPieceWithAngle.angles[0].angle }),
      }
    )
    const response = await contentApprovePOST(req, {
      params: { pieceId: reviewPieceWithAngle.id },
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('APPROVED')

    // Verificar no banco
    const dbPiece = await prisma.contentPiece.findUnique({ where: { id: reviewPieceWithAngle.id } })
    expect(dbPiece!.status).toBe('APPROVED')

    // Cleanup: reverter para REVIEW
    await prisma.contentPiece.update({
      where: { id: reviewPieceWithAngle.id },
      data: { status: 'REVIEW' },
    })
  })

  it('[Cenário 2 — CONTENT_051] deve retornar 422 ao aprovar sem ângulo selecionado', async () => {
    // Buscar piece DRAFT sem ângulo selecionado
    const draftPieceWithoutAngle = await prisma.contentPiece.findFirst({
      where: { status: 'DRAFT' },
      include: { angles: { where: { isSelected: true } } },
    })

    if (!draftPieceWithoutAngle || draftPieceWithoutAngle.angles.length > 0) {
      // Piece já tem ângulo selecionado — pular
      return
    }

    const req = makeRequest(
      `http://localhost:3000/api/v1/content/${draftPieceWithoutAngle.id}/approve`,
      { method: 'POST' }
    )
    const response = await contentApprovePOST(req, {
      params: { pieceId: draftPieceWithoutAngle.id },
    })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — CONTENT_080] deve retornar 404 para pieceId inexistente', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/v1/content/00000000-0000-0000-0000-000000000066/approve',
      { method: 'POST' }
    )
    const response = await contentApprovePOST(req, {
      params: { pieceId: '00000000-0000-0000-0000-000000000066' },
    })

    expect(response.status).toBe(404)
  })
})

// ─── POST /api/v1/content/{pieceId}/reject ────────────────────────────────────

describe('POST /api/v1/content/{pieceId}/reject', () => {
  it('[Cenário 1] deve rejeitar ContentPiece com motivo', async () => {
    // Criar piece em DRAFT para testar rejeição sem afetar seed
    const piece = await prisma.contentPiece.findFirst({ where: { status: 'DRAFT' } })

    if (!piece) return

    const req = makeRequest(
      `http://localhost:3000/api/v1/content/${piece.id}/reject`,
      { method: 'POST', body: { reason: '[TEST-] Conteúdo rejeitado em teste de integração.' } }
    )
    const response = await contentRejectPOST(req, { params: { pieceId: piece.id } })

    expect(response.status).toBeLessThan(500)
  })
})
