/**
 * api-auth.test.ts — TASK-REFORGE-2
 * Testes unitários de requireSession e requireWorkerToken
 * (equivalentes ao withAuth/withRole — padrão adotado no projeto)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock supabase-server
vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn(),
}))

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest(new Request('http://localhost/api/test', { headers }))
}

describe('requireSession', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retorna { user: null, response: 401 } quando supabase.auth.getUser retorna error', async () => {
    const { createClient } = await import('@/lib/supabase-server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Token inválido') }),
      },
    } as never)

    const { requireSession } = await import('@/lib/api-auth')
    const result = await requireSession()

    expect(result.user).toBeNull()
    expect(result.response).not.toBeNull()
    expect(result.response?.status).toBe(401)
  })

  it('retorna { user: null, response: 401 } quando user é null', async () => {
    const { createClient } = await import('@/lib/supabase-server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const { requireSession } = await import('@/lib/api-auth')
    const result = await requireSession()

    expect(result.user).toBeNull()
    expect(result.response?.status).toBe(401)
    const body = await result.response?.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  it('retorna { user, response: null } com sessão válida', async () => {
    const mockUser = { id: 'op-test-1', email: 'op@test.com' }
    const { createClient } = await import('@/lib/supabase-server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as never)

    const { requireSession } = await import('@/lib/api-auth')
    const result = await requireSession()

    expect(result.user).toEqual(mockUser)
    expect(result.response).toBeNull()
  })
})

describe('requireWorkerToken', () => {
  const ORIGINAL_TOKEN = process.env.WORKER_AUTH_TOKEN

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.WORKER_AUTH_TOKEN
    } else {
      process.env.WORKER_AUTH_TOKEN = ORIGINAL_TOKEN
    }
  })

  it('retorna false sem header Authorization', async () => {
    process.env.WORKER_AUTH_TOKEN = 'secret-token-abc'
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({})
    expect(requireWorkerToken(req)).toBe(false)
  })

  it('retorna false com Authorization sem Bearer prefix', async () => {
    process.env.WORKER_AUTH_TOKEN = 'secret-token-abc'
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({ authorization: 'Token secret-token-abc' })
    expect(requireWorkerToken(req)).toBe(false)
  })

  it('retorna false com token incorreto', async () => {
    process.env.WORKER_AUTH_TOKEN = 'correct-token-abc'
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({ authorization: 'Bearer wrong-token-abc' })
    expect(requireWorkerToken(req)).toBe(false)
  })

  it('retorna false quando WORKER_AUTH_TOKEN não está definido', async () => {
    delete process.env.WORKER_AUTH_TOKEN
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({ authorization: 'Bearer any-token' })
    expect(requireWorkerToken(req)).toBe(false)
  })

  it('retorna true com token correto', async () => {
    process.env.WORKER_AUTH_TOKEN = 'valid-worker-token'
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({ authorization: 'Bearer valid-worker-token' })
    expect(requireWorkerToken(req)).toBe(true)
  })

  it('retorna false com token de tamanho diferente (previne timing attack)', async () => {
    process.env.WORKER_AUTH_TOKEN = 'correct'
    const { requireWorkerToken } = await import('@/lib/api-auth')
    const req = makeRequest({ authorization: 'Bearer c' })
    expect(requireWorkerToken(req)).toBe(false)
  })
})

describe('Helpers de resposta', () => {
  it('ok() retorna 200 com { success: true, data }', async () => {
    const { ok } = await import('@/lib/api-auth')
    const res = ok({ value: 42 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.value).toBe(42)
  })

  it('ok() aceita status customizado', async () => {
    const { ok } = await import('@/lib/api-auth')
    const res = ok({}, 201)
    expect(res.status).toBe(201)
  })

  it('notFound() retorna 404', async () => {
    const { notFound } = await import('@/lib/api-auth')
    const res = notFound()
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('badRequest() retorna 400', async () => {
    const { badRequest } = await import('@/lib/api-auth')
    const res = badRequest('Campo obrigatório')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Campo obrigatório')
  })

  it('validationError() retorna 422', async () => {
    const { validationError } = await import('@/lib/api-auth')
    const res = validationError(new Error('Dados inválidos'))
    expect(res.status).toBe(422)
  })

  it('internalError() retorna 500', async () => {
    const { internalError } = await import('@/lib/api-auth')
    const res = internalError()
    expect(res.status).toBe(500)
  })

  it('conflict() retorna 409', async () => {
    const { conflict } = await import('@/lib/api-auth')
    const res = conflict('Já existe')
    expect(res.status).toBe(409)
  })
})
