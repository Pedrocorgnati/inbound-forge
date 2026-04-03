/**
 * health.test.ts
 * Rastreabilidade: INT-044, INT-045, AUTH_001, TASK-4/ST002
 * Testes dos 3 níveis de health check
 */
import { describe, it, expect, vi, _beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    workerHealth: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    contentPiece: {
      count: vi.fn().mockResolvedValue(0),
    },
    conversionEvent: {
      count: vi.fn().mockResolvedValue(0),
    },
    alertLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

// Mock redis
vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    llen: vi.fn().mockResolvedValue(0),
  },
  QUEUE_KEYS: {
    scraping: 'worker:scraping:queue',
    image: 'worker:image:queue',
    publishing: 'worker:publishing:queue',
  },
}))

// Mock NextAuth para health/detailed
vi.mock('@/lib/api-auth', () => ({
  requireSession: vi.fn().mockResolvedValue({ session: null, response: null }),
  internalError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ code: 'SYS_001', message: 'Erro interno' }), { status: 500 })
  ),
}))

describe('GET /api/v1/health — Nível 1 (público)', () => {
  it('retorna 200 sem autenticação com campo status', async () => {
    const { GET } = await import('@/app/api/v1/health/route')
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data?.status ?? body.status).toBeDefined()
  })

  it('responde sem precisar de token', async () => {
    const { GET } = await import('@/app/api/v1/health/route')
    const response = await GET()
    // Nunca 401 para /health público
    expect(response.status).not.toBe(401)
  })
})

describe('GET /api/v1/health/detailed — Nível 2 (autenticado)', () => {
  it('retorna 401 quando requireSession retorna response (sem token)', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      session: null,
      response: new Response(
        JSON.stringify({ code: 'AUTH_001', message: 'Token necessário' }),
        { status: 401 }
      ) as never,
    })

    const { GET } = await import('@/app/api/v1/health/detailed/route')
    const response = await GET()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code ?? body.error?.code).toMatch(/AUTH/)
  })

  it('retorna 200 com sessão válida', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      session: { user: { id: 'op-1' }, expires: '' },
      response: null,
    })

    const { GET } = await import('@/app/api/v1/health/detailed/route')
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBeDefined()
    expect(body.services).toBeDefined()
  })
})

describe('GET /api/v1/health/internal — Nível 3 (secret)', () => {
  it('retorna 401 sem secret', async () => {
    process.env.INTERNAL_HEALTH_SECRET = 'test-secret-123'
    const { GET } = await import('@/app/api/v1/health/internal/route')
    const req = new Request('http://localhost/api/v1/health/internal')
    const response = await GET(req as never)
    expect(response.status).toBe(401)
    delete process.env.INTERNAL_HEALTH_SECRET
  })

  it('retorna 200 com secret correto', async () => {
    process.env.INTERNAL_HEALTH_SECRET = 'test-secret-abc'
    const { GET } = await import('@/app/api/v1/health/internal/route')
    const req = new Request('http://localhost/api/v1/health/internal', {
      headers: { 'x-internal-secret': 'test-secret-abc' },
    })
    const response = await GET(req as never)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBeDefined()
    expect(body.queues).toBeDefined()
    delete process.env.INTERNAL_HEALTH_SECRET
  })

  it('retorna 401 com secret errado', async () => {
    process.env.INTERNAL_HEALTH_SECRET = 'correct-secret'
    const { GET } = await import('@/app/api/v1/health/internal/route')
    const req = new Request('http://localhost/api/v1/health/internal', {
      headers: { 'x-internal-secret': 'wrong-secret' },
    })
    const response = await GET(req as never)
    expect(response.status).toBe(401)
    delete process.env.INTERNAL_HEALTH_SECRET
  })
})
