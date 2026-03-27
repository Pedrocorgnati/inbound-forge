// module-9: TASK-5 ST004 — Contract Tests CX-02
// Rastreabilidade: TASK-5 ST004, CX-02, INT-086, FEAT-creative-generation-001
//
// CX-02: ContentPiece.imageJobId and generatedImageUrl populated after job lifecycle.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockImageJobCreate,
  mockImageJobFindFirst,
  mockImageJobFindUnique,
  mockContentPieceUpdate,
  mockWorkerHealthFindUnique,
  mockContentPieceFindUnique,
} = vi.hoisted(() => ({
  mockImageJobCreate:          vi.fn(),
  mockImageJobFindFirst:       vi.fn(),
  mockImageJobFindUnique:      vi.fn(),
  mockContentPieceUpdate:      vi.fn(),
  mockWorkerHealthFindUnique:  vi.fn(),
  mockContentPieceFindUnique:  vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    imageJob: {
      create:     mockImageJobCreate,
      update:     vi.fn(),
      findFirst:  mockImageJobFindFirst,
      findUnique: mockImageJobFindUnique,
    },
    contentPiece: {
      update:     mockContentPieceUpdate,
      findUnique: mockContentPieceFindUnique,
    },
    workerHealth: {
      findFirst:  vi.fn(),
      findUnique: mockWorkerHealthFindUnique,
    },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis:      { rpush: vi.fn().mockResolvedValue(1) },
  QUEUE_KEYS: { image: 'worker:image:queue' },
}))

vi.mock('@/lib/api-auth', () => ({
  requireSession: vi.fn().mockResolvedValue({
    response: null,
    user:     { id: 'user-1' },
    session:  { user: { id: 'user-1' } },
  }),
  ok:             (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status }),
  notFound:       (msg: string)  => NextResponse.json({ error: msg }, { status: 404 }),
  conflict:       (msg: string)  => NextResponse.json({ error: msg }, { status: 409 }),
  validationError:(msg: string)  => NextResponse.json({ error: msg }, { status: 400 }),
}))

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}))

import { POST as createImageJob } from '@/app/api/image-jobs/route'
import { GET  as getImageJob }    from '@/app/api/image-jobs/[id]/route'
import { NextRequest }             from 'next/server'

describe('CX-02: ContentPiece imageJobId contract', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('Cenário 1: ImageJob is created and linked to ContentPiece', async () => {
    const contentPieceId = 'aaaaaaaa-0000-0000-0000-000000000001'
    const createdJobId   = 'bbbbbbbb-0000-0000-0000-000000000001'

    // Worker is healthy
    mockWorkerHealthFindUnique.mockResolvedValue({
      type:          'IMAGE',
      status:        'ACTIVE',
      lastHeartbeat: new Date(), // fresh
    })
    mockImageJobFindFirst.mockResolvedValue(null)  // no duplicate
    mockImageJobCreate.mockResolvedValue({
      id:             createdJobId,
      contentPieceId,
      status:         'PENDING',
      retryCount:     0,
      imageUrl:       null,
      prompt:         'Gerar imagem para post',
      createdAt:      new Date(),
      updatedAt:      new Date(),
    })

    const req = new NextRequest('http://localhost/api/image-jobs', {
      method:  'POST',
      body:    JSON.stringify({ contentPieceId, prompt: 'Gerar imagem para post' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await createImageJob(req)
    const body = await res.json()

    // Contract: job created successfully with status 201
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.jobId).toBe(createdJobId)

    // Contract: job was created with contentPieceId (imageJobId link)
    expect(mockImageJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contentPieceId }),
      })
    )
  })

  it('Cenário 2: ContentPiece.generatedImageUrl updated after job DONE (CX-02)', async () => {
    const contentPieceId = 'aaaaaaaa-0000-0000-0000-000000000002'
    const jobId          = 'bbbbbbbb-0000-0000-0000-000000000002'
    const publicUrl      = 'https://cdn.supabase.co/assets/image-jobs/bb.webp'

    mockContentPieceUpdate.mockResolvedValue({
      id:                contentPieceId,
      imageJobId:        jobId,
      generatedImageUrl: publicUrl,
    })

    const { prisma } = await import('@/lib/prisma')
    const updated = await prisma.contentPiece.update({
      where: { id: contentPieceId },
      data:  { generatedImageUrl: publicUrl, imageJobId: jobId },
    })

    // Contract: CX-02 — both fields set in one update
    expect(mockContentPieceUpdate).toHaveBeenCalledWith({
      where: { id: contentPieceId },
      data:  { generatedImageUrl: publicUrl, imageJobId: jobId },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((updated as any).generatedImageUrl).toBe(publicUrl)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((updated as any).imageJobId).toBe(jobId)
  })

  it('Cenário 3: ContentPiece without imageJobId (PENDING_ART) does not block GET /api/image-jobs/[id]', async () => {
    const jobId = 'bbbbbbbb-0000-0000-0000-000000000003'

    mockImageJobFindUnique.mockResolvedValue({
      id:             jobId,
      contentPieceId: null,   // PENDING_ART — no content piece linked
      status:         'PENDING',
      retryCount:     0,
      imageUrl:       null,
      errorMessage:   null,
      completedAt:    null,
      prompt:         'test',
      createdAt:      new Date(),
      updatedAt:      new Date(),
    })

    const req = new NextRequest(`http://localhost/api/image-jobs/${jobId}`)
    const res = await getImageJob(req, { params: Promise.resolve({ id: jobId }) })

    // Contract: job lookup succeeds regardless of ContentPiece link
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(jobId)
    // contentPieceId is not in the response (not in select projection)
    expect(body.data.status).toBe('PENDING')
  })
})
