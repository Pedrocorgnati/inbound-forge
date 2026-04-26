/**
 * api-usage.test.ts — TASK-REFORGE-1 ST004
 * Testes das rotas GET /api/v1/api-usage e POST /api/v1/api-usage/log
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock requireSession + helpers
vi.mock('@/lib/api-auth', () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: 'op-1' }, response: null }),
  ok: vi.fn((data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status })
  ),
  badRequest: vi.fn((msg: string) =>
    new Response(JSON.stringify({ success: false, error: msg }), { status: 400 })
  ),
  internalError: vi.fn(() =>
    new Response(JSON.stringify({ success: false, error: 'Erro interno' }), { status: 500 })
  ),
  validationError: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Dados de entrada inválidos'
    return new Response(JSON.stringify({ success: false, error: message }), { status: 422 })
  }),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiUsageLog: {
      groupBy: vi.fn().mockResolvedValue([
        { service: 'anthropic', _sum: { value: 1000, cost: 0.02 }, _count: 5 },
      ]),
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
  },
}))

// Mock redis
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}))

// Mock cost-alert
vi.mock('@/lib/cost-alert', () => ({
  getServiceLimits: vi.fn().mockReturnValue({ anthropic: 100000, ideogram: 50000 }),
}))

// Mock api-usage-tracker
vi.mock('@/lib/api-usage-tracker', () => ({
  trackApiUsage: vi.fn().mockResolvedValue(undefined),
}))

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init))
}

describe('GET /api/v1/api-usage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retorna 200 com dados agregados por serviço', async () => {
    const { GET } = await import('@/app/api/v1/api-usage/route')
    const req = makeRequest('http://localhost/api/v1/api-usage?period=day')
    const response = await GET(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    const anthropic = body.find((r: { service: string }) => r.service === 'anthropic')
    expect(anthropic).toBeDefined()
    expect(anthropic.usedTokens).toBeDefined()
    expect(anthropic.costUSD).toBeDefined()
  })

  it('retorna 401 quando requireSession retorna response (sem sessão)', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: null,
      response: new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401 }),
    })
    const { GET } = await import('@/app/api/v1/api-usage/route')
    const req = makeRequest('http://localhost/api/v1/api-usage')
    const response = await GET(req)
    expect(response.status).toBe(401)
  })

  it('usa period=month como default quando parâmetro ausente', async () => {
    const { prisma } = await import('@/lib/prisma')
    const { GET } = await import('@/app/api/v1/api-usage/route')
    const req = makeRequest('http://localhost/api/v1/api-usage')
    await GET(req)
    expect(prisma.apiUsageLog.groupBy).toHaveBeenCalled()
  })

  it('retorna dados do cache quando disponível', async () => {
    const cached = [{ service: 'anthropic', usedTokens: 500, limitTokens: 100000, costUSD: 0.01, resetAt: '', percentUsed: 0.5 }]
    const { redis } = await import('@/lib/redis')
    vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(cached) as never)
    const { GET } = await import('@/app/api/v1/api-usage/route')
    const req = makeRequest('http://localhost/api/v1/api-usage?period=day')
    const response = await GET(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body[0].service).toBe('anthropic')
  })
})

describe('POST /api/v1/api-usage/log', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retorna 200 com payload válido', async () => {
    const { POST } = await import('@/app/api/v1/api-usage/log/route')
    const req = makeRequest('http://localhost/api/v1/api-usage/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ service: 'anthropic', tokens: 1000, costUSD: 0.02 }),
    })
    const response = await POST(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('retorna 422 com payload inválido (service inválido)', async () => {
    const { POST } = await import('@/app/api/v1/api-usage/log/route')
    const req = makeRequest('http://localhost/api/v1/api-usage/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ service: 'invalid-service', costUSD: 0.01 }),
    })
    const response = await POST(req)
    expect(response.status).toBe(422)
  })

  it('retorna 400 com corpo não-JSON', async () => {
    const { POST } = await import('@/app/api/v1/api-usage/log/route')
    const req = makeRequest('http://localhost/api/v1/api-usage/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  it('retorna 401 sem sessão', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: null,
      response: new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401 }),
    })
    const { POST } = await import('@/app/api/v1/api-usage/log/route')
    const req = makeRequest('http://localhost/api/v1/api-usage/log', {
      method: 'POST',
      body: JSON.stringify({ service: 'anthropic', costUSD: 0.01 }),
    })
    const response = await POST(req)
    expect(response.status).toBe(401)
  })
})
