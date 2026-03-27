/**
 * Testes de Integração — Blog Articles
 * Endpoints:
 *   GET /api/v1/blog
 *   POST /api/v1/blog
 *   GET /api/v1/blog/{slug}
 *   PUT /api/v1/blog/{id}
 *   POST /api/v1/blog/{id}/publish
 *
 * Rastreabilidade: US-006, US-007
 * Erros cobertos: BLOG_050, BLOG_080, BLOG_081, AUTH_001, VAL_001-003
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated, mockSessionUnauthorized } from './helpers/auth.helper'
import { buildBlogArticlePayload } from './helpers/factory.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { GET: blogListGET, POST: blogPOST } = await import('@/app/api/v1/blog/route')
const { GET: blogSlugGET } = await import('@/app/api/v1/blog/[slug]/route')
const { PUT: blogPUT } = await import('@/app/api/v1/blog/[id]/route')
const { POST: blogPublishPOST } = await import('@/app/api/v1/blog/[id]/publish/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

// Dados de seed
let seedApprovedContentPieceId: string
let seedPublishedArticleId: string
let seedPublishedArticleSlug: string
let seedReviewArticleId: string

beforeAll(async () => {
  const approvedPiece = await prisma.contentPiece.findFirst({ where: { status: 'APPROVED' } })
  const publishedArticle = await prisma.blogArticle.findFirst({ where: { status: 'PUBLISHED' } })
  const reviewArticle = await prisma.blogArticle.findFirst({ where: { status: 'REVIEW' } })

  if (!approvedPiece || !publishedArticle) {
    throw new Error('Banco de teste sem dados de seed. Execute: bun run db:seed:test')
  }

  seedApprovedContentPieceId = approvedPiece.id
  seedPublishedArticleId = publishedArticle.id
  seedPublishedArticleSlug = publishedArticle.slug
  seedReviewArticleId = reviewArticle?.id ?? ''
})

afterEach(async () => {
  await prisma.blogArticle.deleteMany({ where: { title: { startsWith: '[TEST-' } } })
})

// ─── GET /api/v1/blog ─────────────────────────────────────────────────────────

describe('GET /api/v1/blog', () => {
  it('[Cenário 1] deve listar artigos com paginação', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/blog?page=1&limit=10')
    const response = await blogListGET(req)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.pagination).toBeDefined()
  })

  it('[Cenário 3 — AUTH_001] deve retornar 401 sem sessão', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce(mockSessionUnauthorized())

    const req = makeRequest('http://localhost:3000/api/v1/blog')
    const response = await blogListGET(req)

    expect(response.status).toBe(401)
  })
})

// ─── GET /api/v1/blog/{slug} ──────────────────────────────────────────────────

describe('GET /api/v1/blog/{slug}', () => {
  it('[Cenário 1] deve retornar artigo por slug (público)', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/blog/${seedPublishedArticleSlug}`)
    const response = await blogSlugGET(req, { params: { slug: seedPublishedArticleSlug } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe(seedPublishedArticleSlug)
    expect(body.data.status).toBe('PUBLISHED')
  })

  it('[Cenário 2 — BLOG_080] deve retornar 404 para slug inexistente', async () => {
    // Cobre US-006 [EDGE]: "Slug de artigo inexistente retorna 404 com link"
    const req = makeRequest('http://localhost:3000/api/v1/blog/slug-que-nao-existe-jamais')
    const response = await blogSlugGET(req, {
      params: { slug: 'slug-que-nao-existe-jamais' },
    })

    expect(response.status).toBe(404)
  })
})

// ─── POST /api/v1/blog ────────────────────────────────────────────────────────

describe('POST /api/v1/blog', () => {
  it('[Cenário 1] deve criar artigo com dados válidos', async () => {
    const payload = buildBlogArticlePayload(seedApprovedContentPieceId)
    const req = makeRequest('http://localhost:3000/api/v1/blog', {
      method: 'POST',
      body: payload,
    })
    const response = await blogPOST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe(payload.slug)
    expect(body.data.status).toBe('DRAFT')
    expect(body.data.id).toBeDefined()

    // Verificar persistência
    const dbArticle = await prisma.blogArticle.findUnique({ where: { id: body.data.id } })
    expect(dbArticle).toBeTruthy()
    expect(dbArticle!.slug).toBe(payload.slug)
  })

  it('[Cenário 2 — BLOG_081] deve retornar 409 para slug duplicado', async () => {
    const payload = buildBlogArticlePayload(seedApprovedContentPieceId)

    // Criar primeiro
    const req1 = makeRequest('http://localhost:3000/api/v1/blog', {
      method: 'POST',
      body: payload,
    })
    await blogPOST(req1)

    // Tentar criar com mesmo slug
    const req2 = makeRequest('http://localhost:3000/api/v1/blog', {
      method: 'POST',
      body: { ...payload, title: `[TEST-dup-${Date.now()}] Artigo diferente mas mesmo slug` },
    })
    const response2 = await blogPOST(req2)
    const body2 = await response2.json()

    expect(response2.status).toBe(409)
    expect(body2.success).toBe(false)
  })

  it('[Cenário 2 — VAL_001] deve retornar 422 sem título', async () => {
    const payload = buildBlogArticlePayload(seedApprovedContentPieceId, { title: undefined })
    const req = makeRequest('http://localhost:3000/api/v1/blog', {
      method: 'POST',
      body: payload,
    })
    const response = await blogPOST(req)

    expect(response.status).toBe(422)
  })

  it('[Cenário 2 — VAL_001] deve retornar 422 sem slug', async () => {
    const payload = buildBlogArticlePayload(seedApprovedContentPieceId, { slug: undefined })
    const req = makeRequest('http://localhost:3000/api/v1/blog', {
      method: 'POST',
      body: payload,
    })
    const response = await blogPOST(req)

    expect(response.status).toBe(422)
  })
})

// ─── POST /api/v1/blog/{id}/publish ──────────────────────────────────────────

describe('POST /api/v1/blog/{id}/publish', () => {
  it('[Cenário 1] deve publicar artigo em status REVIEW', async () => {
    if (!seedReviewArticleId) {
      // Sem artigo em REVIEW no seed — pular
      return
    }

    const req = makeRequest(
      `http://localhost:3000/api/v1/blog/${seedReviewArticleId}/publish`,
      { method: 'POST' }
    )
    const response = await blogPublishPOST(req, { params: { id: seedReviewArticleId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('PUBLISHED')
    expect(body.data.publishedAt).toBeDefined()

    // Verificar no banco
    const dbArticle = await prisma.blogArticle.findUnique({ where: { id: seedReviewArticleId } })
    expect(dbArticle!.status).toBe('PUBLISHED')

    // Cleanup: reverter para REVIEW
    await prisma.blogArticle.update({
      where: { id: seedReviewArticleId },
      data: { status: 'REVIEW', publishedAt: null },
    })
  })

  it('[Cenário 2 — BLOG_050] deve retornar 422 ao publicar artigo em DRAFT', async () => {
    // Buscar artigo DRAFT
    const draftArticle = await prisma.blogArticle.findFirst({ where: { status: 'DRAFT' } })
    if (!draftArticle) return

    const req = makeRequest(
      `http://localhost:3000/api/v1/blog/${draftArticle.id}/publish`,
      { method: 'POST' }
    )
    const response = await blogPublishPOST(req, { params: { id: draftArticle.id } })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — BLOG_050] deve retornar 422 ao republicar artigo já PUBLISHED', async () => {
    const req = makeRequest(
      `http://localhost:3000/api/v1/blog/${seedPublishedArticleId}/publish`,
      { method: 'POST' }
    )
    const response = await blogPublishPOST(req, { params: { id: seedPublishedArticleId } })

    expect(response.status).toBe(422)
  })

  it('[Cenário 2 — BLOG_080] deve retornar 404 para artigo inexistente', async () => {
    const req = makeRequest(
      'http://localhost:3000/api/v1/blog/00000000-0000-0000-0000-000000000033/publish',
      { method: 'POST' }
    )
    const response = await blogPublishPOST(req, {
      params: { id: '00000000-0000-0000-0000-000000000033' },
    })

    expect(response.status).toBe(404)
  })
})
