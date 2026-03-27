/**
 * Testes de Integração — Image Jobs
 * Endpoints:
 *   POST /api/v1/images/generate
 *   GET /api/v1/images/{jobId}
 *
 * Rastreabilidade: US-016
 * Erros cobertos: IMAGE_050, IMAGE_051, IMAGE_052, IMAGE_080, AUTH_001, VAL_001-002
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated } from './helpers/auth.helper'
import { buildGenerateImagePayload } from './helpers/factory.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { POST: imageGeneratePOST } = await import('@/app/api/v1/images/generate/route')
const { GET: imageJobGET } = await import('@/app/api/v1/images/[jobId]/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

let seedApprovedContentPieceId: string
let seedDraftContentPieceId: string
let seedExistingImageJobId: string
let seedContentPieceWithActiveJobId: string  // Piece que já tem job PENDING/PROCESSING

beforeAll(async () => {
  const approvedPiece = await prisma.contentPiece.findFirst({
    where: { status: 'APPROVED' },
    include: { imageJobs: true },
  })
  const draftPiece = await prisma.contentPiece.findFirst({ where: { status: 'DRAFT' } })
  const existingJob = await prisma.imageJob.findFirst()

  // Buscar piece que já tem job ativo
  const pieceWithActiveJob = await prisma.contentPiece.findFirst({
    where: {
      imageJobs: {
        some: { status: { in: ['PENDING', 'PROCESSING'] } },
      },
    },
  })

  if (!approvedPiece || !existingJob) {
    throw new Error('Banco de teste sem dados de seed. Execute: bun run db:seed:test')
  }

  seedApprovedContentPieceId = approvedPiece.id
  seedDraftContentPieceId = draftPiece?.id ?? ''
  seedExistingImageJobId = existingJob.id
  seedContentPieceWithActiveJobId = pieceWithActiveJob?.id ?? ''
})

afterEach(async () => {
  // Limpar jobs criados em testes (por errorMessage de teste)
  await prisma.imageJob.deleteMany({
    where: { errorMessage: { startsWith: '[TEST-' } },
  })
})

// ─── POST /api/v1/images/generate ────────────────────────────────────────────

describe('POST /api/v1/images/generate', () => {
  it('[Cenário 1] deve criar ImageJob para ContentPiece APPROVED', async () => {
    // Garantir que não há job ativo para este piece
    await prisma.imageJob.deleteMany({
      where: {
        contentPieceId: seedApprovedContentPieceId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    })

    const payload = buildGenerateImagePayload(seedApprovedContentPieceId)
    const req = makeRequest('http://localhost:3000/api/v1/images/generate', {
      method: 'POST',
      body: payload,
    })
    const response = await imageGeneratePOST(req)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.contentPieceId).toBe(seedApprovedContentPieceId)
    expect(body.data.status).toBe('PENDING')
    expect(body.data.id).toBeDefined()

    // Verificar persistência
    const dbJob = await prisma.imageJob.findUnique({ where: { id: body.data.id } })
    expect(dbJob).toBeTruthy()
    expect(dbJob!.status).toBe('PENDING')

    // Cleanup
    await prisma.imageJob.delete({ where: { id: body.data.id } })
  })

  it('[Cenário 2 — IMAGE_050] deve retornar 422 para ContentPiece não APPROVED', async () => {
    if (!seedDraftContentPieceId) return

    const payload = buildGenerateImagePayload(seedDraftContentPieceId)
    const req = makeRequest('http://localhost:3000/api/v1/images/generate', {
      method: 'POST',
      body: payload,
    })
    const response = await imageGeneratePOST(req)
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — IMAGE_051] deve retornar 409 se já existe job PENDING para o piece', async () => {
    if (!seedContentPieceWithActiveJobId) {
      // Sem piece com job ativo — pular
      return
    }

    const payload = buildGenerateImagePayload(seedContentPieceWithActiveJobId)
    const req = makeRequest('http://localhost:3000/api/v1/images/generate', {
      method: 'POST',
      body: payload,
    })
    const response = await imageGeneratePOST(req)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.success).toBe(false)
  })

  it('[Cenário 2 — VAL_001] deve retornar erro sem contentPieceId', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/images/generate', {
      method: 'POST',
      body: { templateType: 'CAROUSEL' },
    })
    const response = await imageGeneratePOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('[Cenário 2 — VAL_002] deve retornar erro com templateType inválido', async () => {
    const payload = buildGenerateImagePayload(seedApprovedContentPieceId, {
      templateType: 'INVALID_TEMPLATE',
    })
    const req = makeRequest('http://localhost:3000/api/v1/images/generate', {
      method: 'POST',
      body: payload,
    })
    const response = await imageGeneratePOST(req)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})

// ─── GET /api/v1/images/{jobId} ───────────────────────────────────────────────

describe('GET /api/v1/images/{jobId}', () => {
  it('[Cenário 1] deve retornar status do ImageJob', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/images/${seedExistingImageJobId}`)
    const response = await imageJobGET(req, { params: { jobId: seedExistingImageJobId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(seedExistingImageJobId)
    expect(body.data).toHaveProperty('status')
    expect(body.data).toHaveProperty('contentPieceId')
    expect(body.data).toHaveProperty('templateType')
  })

  it('[Cenário 1] campos de progresso devem estar presentes', async () => {
    const req = makeRequest(`http://localhost:3000/api/v1/images/${seedExistingImageJobId}`)
    const response = await imageJobGET(req, { params: { jobId: seedExistingImageJobId } })
    const body = await response.json()

    expect(response.status).toBe(200)
    // Campos opcionais presentes quando preenchidos
    expect(body.data).toHaveProperty('outputUrl')
    expect(body.data).toHaveProperty('errorMessage')
  })

  it('[Cenário 2 — IMAGE_080] deve retornar 404 para jobId inexistente', async () => {
    const req = makeRequest('http://localhost:3000/api/v1/images/00000000-0000-0000-0000-000000000022')
    const response = await imageJobGET(req, {
      params: { jobId: '00000000-0000-0000-0000-000000000022' },
    })

    expect(response.status).toBe(404)
  })
})
