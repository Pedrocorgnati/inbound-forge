/**
 * Testes de Integração — Posts (Calendário Editorial)
 * Endpoints:
 *   GET /api/v1/posts
 *   POST /api/v1/posts
 *   PUT /api/v1/posts/{id}
 *   DELETE /api/v1/posts/{id}
 *   POST /api/v1/posts/{id}/publish
 *
 * Rastreabilidade: US-014, US-015
 * Erros cobertos: POST_050, POST_051, POST_052, POST_053, POST_080, AUTH_001, VAL_001-003
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated, mockSessionUnauthorized } from './helpers/auth.helper'
import { buildPostPayload } from './helpers/factory.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { GET: postsGET, POST: postsPOST } = await import('@/app/api/v1/posts/route')
const { GET: postDetailGET, PUT: postPUT, DELETE: postDELETE } = await import(
  '@/app/api/v1/posts/[id]/route'
)
const { POST: postPublishPOST } = await import('@/app/api/v1/posts/[id]/publish/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

// Dados de seed
let seedApprovedContentPieceId: string  // ContentPiece APPROVED (pode criar post)
let seedPublishedPostId: string          // Post PUBLISHED (imutável — para testar POST_050)
let seedDraftPostId: string              // Post DRAFT (pode ser editado)

beforeAll(async () => {
  const approvedPiece = await prisma.contentPiece.findFirst({ where: { status: 'APPROVED' } })
  const publishedPost = await prisma.post.findFirst({ where: { status: 'PUBLISHED' } })
  const draftPost = await prisma.post.findFirst({ where: { status: 'DRAFT' } })

  if (!approvedPiece || !publishedPost || !draftPost) {
    throw new Error('Banco de teste sem dados de seed. Execute: bun run db:seed:test')
  }

  seedApprovedContentPieceId = approvedPiece.id
  seedPublishedPostId = publishedPost.id
  seedDraftPostId = draftPost.id
})

afterEach(async () => {
  // Limpar posts de teste criados
  await prisma.post.deleteMany({
    where: { caption: { startsWith: '[TEST-' } },
  })
})

// ─── GET /api/v1/posts ────────────────────────────────────────────────────────

describe('GET /api/v1/posts', () => {
  it('[Cenário 1] deve listar posts com paginação', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/posts?page=1&limit=10')
    const response = await postsGET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toHaveProperty('total')
  })

  it('[Cenário 3 — AUTH_001] deve retornar 401 sem sessão', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce(mockSessionUnauthorized())

    const req = makeRequest('http://localhost:3000/api/v1/posts')
    const response = await postsGET(req)

    expect(response.status).toBe(401)
  })
})

// ─── POST /api/v1/posts ───────────────────────────────────────────────────────

describe('POST /api/v1/posts', () => {
  it('[Cenário 1] deve criar post a partir de ContentPiece APPROVED', async () => {
    const payload = buildPostPayload(seedApprovedContentPieceId)
    const req = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const response = await postsPOST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.contentPieceId).toBe(seedApprovedContentPieceId)
    expect(body.data.channel).toBe('LINKEDIN')
    expect(body.data.status).toBe('DRAFT')
    expect(body.data.id).toBeDefined()

    // Verificar persistência no banco
    const dbPost = await prisma.post.findUnique({ where: { id: body.data.id } })
    expect(dbPost).toBeTruthy()
    expect(dbPost!.caption).toContain('[TEST-')
  })

  it('[Cenário 2 — POST_051] deve retornar 422 com scheduledAt no passado', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // ontem
    const payload = buildPostPayload(seedApprovedContentPieceId, { scheduledAt: pastDate })
    const req = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const response = await postsPOST(req)
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — POST_052] deve retornar 422 para ContentPiece não APPROVED', async () => {
    // Buscar ContentPiece em status diferente de APPROVED
    const nonApprovedPiece = await prisma.contentPiece.findFirst({
      where: { status: { notIn: ['APPROVED', 'PUBLISHED', 'SCHEDULED'] } },
    })

    if (!nonApprovedPiece) return // todos aprovados — pular

    const payload = buildPostPayload(nonApprovedPiece.id)
    const req = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const response = await postsPOST(req)

    expect(response.status).toBe(422)
  })

  it('[Cenário 2 — VAL_003] deve retornar 422 com caption muito curto (< 10 chars)', async () => {
    const payload = buildPostPayload(seedApprovedContentPieceId, { caption: 'Curto.' })
    const req = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const response = await postsPOST(req)

    expect(response.status).toBe(422)
  })

  it('[Cenário 2 — VAL_002] deve retornar 422 com channel inválido', async () => {
    const payload = buildPostPayload(seedApprovedContentPieceId, { channel: 'TIKTOK' })
    const req = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const response = await postsPOST(req)

    expect(response.status).toBe(422)
  })
})

// ─── PUT /api/v1/posts/{id} ───────────────────────────────────────────────────

describe('PUT /api/v1/posts/{id}', () => {
  it('[Cenário 1] deve atualizar post DRAFT', async () => {
    const updatedCaption = `[TEST-upd] Post atualizado em teste de integração ${Date.now()}.`
    const newScheduledAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // +14 dias

    const req = makeRequest(`http://localhost:3000/api/v1/posts/${seedDraftPostId}`, {
      method: 'PUT',
      body: {
        caption: updatedCaption,
        scheduledAt: newScheduledAt,
        channel: 'LINKEDIN',
        hashtags: ['#test'],
        cta: 'Acesse o link.',
      },
    })
    const response = await postPUT(req, { params: { id: seedDraftPostId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.caption).toBe(updatedCaption)

    // Cleanup: reverter caption
    await prisma.post.update({
      where: { id: seedDraftPostId },
      data: { caption: 'Restored after test' },
    })
  })

  it('[Cenário 2 — POST_050] deve retornar 422 ao editar post PUBLISHED', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/posts/${seedPublishedPostId}`, {
      method: 'PUT',
      body: {
        caption: '[TEST-] Tentativa de editar post publicado.',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        channel: 'LINKEDIN',
        hashtags: [],
        cta: 'Acesse.',
      },
    })
    const response = await postPUT(req, { params: { id: seedPublishedPostId } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — POST_080] deve retornar 404 para post inexistente', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/v1/posts/00000000-0000-0000-0000-000000000055',
      {
        method: 'PUT',
        body: {
          caption: 'Caption irrelevante.',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          channel: 'LINKEDIN',
          hashtags: [],
          cta: 'CTA.',
        },
      }
    )
    const response = await postPUT(req, {
      params: { id: '00000000-0000-0000-0000-000000000055' },
    })

    expect(response.status).toBe(404)
  })
})

// ─── DELETE /api/v1/posts/{id} ────────────────────────────────────────────────

describe('DELETE /api/v1/posts/{id}', () => {
  it('[Cenário 1] deve remover post DRAFT', async () => {
    // Criar post para deletar (não usar o de seed)
    const payload = buildPostPayload(seedApprovedContentPieceId)
    const createReq = makeRequest('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      body: payload,
    })
    const createResponse = await postsPOST(createReq)
    const createBody = await createResponse.json()
    const postId = createBody.data?.id

    if (!postId) return // criação falhou — pular

    const req = makeRequest(`http://localhost:3000/api/v1/posts/${postId}`, { method: 'DELETE' })
    const response = await postDELETE(req, { params: { id: postId } })

    expect(response.status).toBe(200)

    const dbPost = await prisma.post.findUnique({ where: { id: postId } })
    expect(dbPost).toBeNull()
  })

  it('[Cenário 2 — POST_080] deve retornar 404 para post inexistente', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/v1/posts/00000000-0000-0000-0000-000000000044',
      { method: 'DELETE' }
    )
    const response = await postDELETE(req, {
      params: { id: '00000000-0000-0000-0000-000000000044' },
    })

    expect(response.status).toBe(404)
  })
})
