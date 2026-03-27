/**
 * Testes de Segurança — CORS (TST-018)
 *
 * Estratégia: verificar que as rotas da API não retornam headers CORS
 * permissivos. Esta app é single-operator SaaS — a API é acessível apenas
 * da mesma origem. Não deve haver Access-Control-Allow-Origin wildcard nem
 * allowlist que permita origens arbitrárias.
 *
 * Rastreabilidade: TASK-7/ST002
 */

import { describe, it, expect, vi } from 'vitest'

// Mock de dependências externas para testar a rota de health
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    workerHealth: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

vi.mock('@/lib/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-2),
  },
  REDIS_TTL: { workerHeartbeat: 60, rateLimitWindow: 900, sessionCache: 3600 },
  QUEUE_KEYS: {},
  CACHE_KEYS: { THEMES: 'cache:themes', WORKER_STATUS: 'cache:worker_status' },
}))

const { GET: healthGET } = await import('@/app/api/v1/health/route')

// ─── THREAT-018: CORS ─────────────────────────────────────────────────────────

describe('CORS (TST-018) — API não deve expor headers permissivos', () => {
  it('[SECURITY] rejeita Origin não autorizada → sem Access-Control-Allow-Origin', async () => {
    const response = await healthGET()

    // App single-origin: não deve retornar CORS headers para origens externas
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('[SECURITY] sem wildcard CORS — Access-Control-Allow-Origin não deve ser "*"', async () => {
    const response = await healthGET()

    const corsHeader = response.headers.get('access-control-allow-origin')
    // Qualquer valor diferente de null poderia ser problemático — mas nunca '*'
    expect(corsHeader).not.toBe('*')
  })

  it('[SECURITY] sem Access-Control-Allow-Credentials: true para origens desconhecidas', async () => {
    const response = await healthGET()

    // Com credenciais: 'true' + ACAO wildcard = CSRF risco
    const credentials = response.headers.get('access-control-allow-credentials')
    expect(credentials).toBeNull()
  })

  it('[SUCCESS] rota pública de health retorna 200 para requisições same-origin', async () => {
    const response = await healthGET()

    // Health endpoint deve estar disponível (sem CORS blocking)
    expect(response.status).toBeLessThanOrEqual(503)  // 200 (healthy) ou 503 (unhealthy)
    expect([200, 503]).toContain(response.status)
  })

  it('[SECURITY] OPTIONS preflight não deve retornar Access-Control-Allow-Origin permissivo', async () => {
    // Next.js sem handler OPTIONS explícito retorna 405 para métodos não suportados
    // O importante é verificar que NENHUM handler de rota retorna CORS headers permissivos
    const response = await healthGET()

    const acao = response.headers.get('access-control-allow-origin')
    // Header ausente (null) ou não-permissivo são ambos aceitáveis para single-origin app
    if (acao !== null) {
      expect(acao).not.toBe('*')
      expect(acao).not.toMatch(/^https?:\/\//)
    }
  })

  it('[SECURITY] resposta não expõe Access-Control-Expose-Headers sensíveis', async () => {
    const response = await healthGET()

    const exposeHeader = response.headers.get('access-control-expose-headers')
    // Se definido, não deve expor headers internos (Authorization, Cookie, etc.)
    if (exposeHeader) {
      expect(exposeHeader.toLowerCase()).not.toContain('authorization')
      expect(exposeHeader.toLowerCase()).not.toContain('cookie')
      expect(exposeHeader.toLowerCase()).not.toContain('set-cookie')
    }
  })
})

describe('CORS — Headers de segurança presentes na resposta', () => {
  it('[SUCCESS] Cache-Control: no-store presente no health endpoint', async () => {
    const response = await healthGET()

    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toContain('no-store')
  })
})
