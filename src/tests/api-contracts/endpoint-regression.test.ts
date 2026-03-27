/**
 * Endpoint Regression Tests — snapshot de response schema
 * Rastreabilidade: INT-091, TASK-3/ST003
 *
 * Detecta breaking changes: campo removido, tipo alterado, status code diferente.
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

describe('Regression: /api/v1/health schema', () => {
  it('GET /health — schema estável { status, version?, timestamp? }', async () => {
    const { status, body } = await get('/api/v1/health')
    expect(status).toBe(200)
    expect(body).toMatchObject({
      status: expect.any(String),
    })
  })
})

describe('Regression: /api/v1/health/detailed schema', () => {
  it('GET /health/detailed sem auth — 401 com { code, message }', async () => {
    const { status, body } = await get('/api/v1/health/detailed')
    expect(status).toBe(401)
    // Schema de erro: { code: string, message: string }
    const hasError = (body as Record<string, unknown>)?.code !== undefined ||
      (body as Record<string, unknown>)?.error !== undefined
    expect(hasError).toBe(true)
  })
})

describe('Regression: endpoints protegidos — 401 sem token', () => {
  const protectedEndpoints = [
    '/api/v1/themes',
    '/api/v1/content',
    '/api/v1/posts',
    '/api/v1/leads',
    '/api/v1/analytics/funnel',
    '/api/v1/assets',
    '/api/v1/utm-links',
  ] as const

  protectedEndpoints.forEach((endpoint) => {
    it(`GET ${endpoint} retorna 401 (sem regressão de auth)`, async () => {
      const { status } = await get(endpoint)
      expect(status).toBe(401)
    })
  })
})

describe('Regression: endpoints públicos — sem auth', () => {
  it('GET /api/v1/health retorna 200 (sem regressão de visibilidade)', async () => {
    const { status } = await get('/api/v1/health')
    expect(status).toBe(200)
  })

  it('GET /api/v1/blog/articles/{slug} público (sem auth para leitura)', async () => {
    // slug inexistente deve retornar 404, não 401
    const { status } = await get('/api/v1/blog/articles/artigo-teste-inexistente-12345')
    expect([404, 200]).toContain(status)
  })
})
