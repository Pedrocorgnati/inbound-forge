/**
 * Integration tests — Post lifecycle (cancel / edit / duplicate)
 * Intake-Review TASK-1 ST001/ST002/ST003 (CL-224, CL-225, CL-226)
 *
 * Requer DB disponivel (vitest.integration.config.ts).
 * Mocka requireSession via vi.mock.
 */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated, TEST_OPERATOR } from './helpers/auth.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { POST: cancelPOST } = await import('@/app/api/v1/posts/[id]/cancel/route')
const { PATCH: postPATCH } = await import('@/app/api/v1/posts/[id]/route')
const { POST: duplicatePOST } = await import('@/app/api/v1/posts/[id]/duplicate/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

async function createTestPost(overrides: Partial<{ status: string; channel: string; scheduledAt: Date }> = {}) {
  return prisma.post.create({
    data: {
      channel: (overrides.channel as 'INSTAGRAM' | 'LINKEDIN' | 'BLOG' | undefined) ?? 'LINKEDIN',
      caption: 'Post de teste com mais de dez caracteres',
      hashtags: ['#test'],
      status: (overrides.status as 'SCHEDULED' | 'DRAFT' | 'PUBLISHED' | undefined) ?? 'SCHEDULED',
      scheduledAt: overrides.scheduledAt ?? new Date(Date.now() + 3600_000),
    },
  })
}

describe('POST /api/v1/posts/[id]/cancel (CL-224)', () => {
  afterEach(async () => {
    await prisma.publishAuditLog.deleteMany({ where: { operatorId: TEST_OPERATOR.id } })
    await prisma.post.deleteMany({ where: { caption: { contains: 'teste' } } })
  })

  it('cancels SCHEDULED post and returns 200', async () => {
    const post = await createTestPost({ status: 'SCHEDULED' })
    const req = makeRequest(`/api/v1/posts/${post.id}/cancel`)
    const res = await cancelPOST(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(200)
    const fresh = await prisma.post.findUnique({ where: { id: post.id } })
    expect(fresh?.status).toBe('CANCELLED')
    expect(fresh?.cancelledAt).not.toBeNull()
  })

  it('returns 409 when post is PUBLISHED', async () => {
    const post = await createTestPost({ status: 'PUBLISHED' })
    const req = makeRequest(`/api/v1/posts/${post.id}/cancel`)
    const res = await cancelPOST(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(409)
  })

  it('writes PublishAuditLog with action=cancel', async () => {
    const post = await createTestPost({ status: 'SCHEDULED' })
    const req = makeRequest(`/api/v1/posts/${post.id}/cancel`)
    await cancelPOST(req, { params: Promise.resolve({ id: post.id }) })
    const audit = await prisma.publishAuditLog.findFirst({ where: { postId: post.id, action: 'cancel' } })
    expect(audit).not.toBeNull()
    expect(audit?.operatorId).toBe(TEST_OPERATOR.id)
  })
})

describe('PATCH /api/v1/posts/[id] (CL-225)', () => {
  afterEach(async () => {
    await prisma.publishAuditLog.deleteMany({ where: { operatorId: TEST_OPERATOR.id } })
    await prisma.post.deleteMany({ where: { caption: { contains: 'teste' } } })
  })

  it('updates caption only, keeps other fields', async () => {
    const post = await createTestPost()
    const req = makeRequest(`/api/v1/posts/${post.id}`, {
      method: 'PATCH',
      body: { caption: 'Nova caption com mais de dez caracteres' },
    })
    const res = await postPATCH(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(200)
    const fresh = await prisma.post.findUnique({ where: { id: post.id } })
    expect(fresh?.caption).toContain('Nova caption')
    expect(fresh?.channel).toBe(post.channel)
  })

  it('rejects PATCH when status=PUBLISHED with 409', async () => {
    const post = await createTestPost({ status: 'PUBLISHED' })
    const req = makeRequest(`/api/v1/posts/${post.id}`, {
      method: 'PATCH',
      body: { caption: 'qualquer nova caption' },
    })
    const res = await postPATCH(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(409)
  })
})

describe('POST /api/v1/posts/[id]/duplicate (CL-226)', () => {
  afterEach(async () => {
    await prisma.publishAuditLog.deleteMany({ where: { operatorId: TEST_OPERATOR.id } })
    await prisma.post.deleteMany({ where: { caption: { contains: 'teste' } } })
  })

  it('duplicates LinkedIn post to Instagram with adapted content and preserves sourcePostId', async () => {
    const post = await createTestPost({ channel: 'LINKEDIN' })
    const req = makeRequest(`/api/v1/posts/${post.id}/duplicate`, {
      body: { targetChannel: 'INSTAGRAM' },
    })
    const res = await duplicatePOST(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { post: { id: string; channel: string; sourcePostId: string | null } }
    expect(json.post.channel).toBe('INSTAGRAM')
    expect(json.post.sourcePostId).toBe(post.id)
  })

  it('rejects duplicate to same channel with 400', async () => {
    const post = await createTestPost({ channel: 'LINKEDIN' })
    const req = makeRequest(`/api/v1/posts/${post.id}/duplicate`, {
      body: { targetChannel: 'LINKEDIN' },
    })
    const res = await duplicatePOST(req, { params: Promise.resolve({ id: post.id }) })
    expect(res.status).toBe(400)
  })
})

beforeAll(() => {
  // garantir contexto Prisma inicializado antes dos testes
  return prisma.$connect()
})
