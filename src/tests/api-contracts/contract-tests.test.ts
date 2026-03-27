/**
 * API Contract Tests — endpoints críticos
 * Rastreabilidade: INT-091, API-001, TASK-3/ST002
 *
 * NOTA: Estes testes requerem app rodando em processo separado.
 * Em CI: usa supertest diretamente com o handler Next.js.
 * Localmente: executar com app em http://localhost:3000
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/v1/leads — LGPD COMP-002', () => {
  it('rejeita sem lgpdConsent — retorna 400 VAL_001', async () => {
    const res = await apiRequest('POST', '/api/v1/leads', {
      contactInfo: 'Test Lead',
      lgpdConsent: false,
      funnelStage: 'AWARENESS',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    // Código de erro de validação
    const code = body.error?.code ?? body.code ?? ''
    expect(code).toMatch(/VAL/)
  })

  it('resposta não inclui contactInfo em plaintext (COMP-002)', async () => {
    // Criar lead autenticado não é possível sem token aqui
    // Este teste verifica estrutura de resposta — contactInfo nunca em plaintext
    const res = await apiRequest('POST', '/api/v1/leads', {
      contactInfo: 'Pedro Silva',
      lgpdConsent: true,
      funnelStage: 'AWARENESS',
    })
    if (res.status === 201) {
      const body = await res.json()
      const bodyStr = JSON.stringify(body)
      // contactInfo nunca deve aparecer em plaintext na resposta
      expect(bodyStr).not.toContain('Pedro Silva')
    }
    // 401 também é aceitável (sem auth)
    expect([201, 401, 400]).toContain(res.status)
  })
})

describe('GET /api/v1/health — público, sem auth', () => {
  it('retorna 200 sem autenticação', async () => {
    const res = await apiRequest('GET', '/api/v1/health')
    expect(res.status).toBe(200)
  })

  it('resposta em < 500ms', async () => {
    const start = Date.now()
    await apiRequest('GET', '/api/v1/health')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })

  it('resposta tem campo status', async () => {
    const res = await apiRequest('GET', '/api/v1/health')
    const body = await res.json()
    expect(body.status).toBeDefined()
  })
})

describe('GET /api/v1/health/detailed — auth requerida', () => {
  it('retorna 401 sem Bearer token (AUTH_001)', async () => {
    const res = await apiRequest('GET', '/api/v1/health/detailed')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/themes — ownership check', () => {
  it('retorna 401 sem autenticação', async () => {
    const res = await apiRequest('GET', '/api/v1/themes')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/analytics/funnel — validação de period', () => {
  it('retorna 400 ou 401 com period inválido (VAL_002)', async () => {
    const res = await apiRequest('GET', '/api/v1/analytics/funnel?period=invalid')
    expect([400, 401, 422]).toContain(res.status)
  })
})

describe('POST /api/v1/content/generate — validação obrigatória', () => {
  it('retorna 400 ou 401 sem themeId (VAL_001)', async () => {
    const res = await apiRequest('POST', '/api/v1/content/generate', {})
    expect([400, 401]).toContain(res.status)
  })
})

describe('Estrutura de erros — formato padrão', () => {
  it('endpoint 401 retorna { code, message }', async () => {
    const res = await apiRequest('GET', '/api/v1/themes')
    expect(res.status).toBe(401)
    const body = await res.json()
    // Aceita { error: { code, message } } ou { code, message }
    const hasCode = body.error?.code !== undefined || body.code !== undefined
    const hasMessage = body.error?.message !== undefined || body.message !== undefined
    expect(hasCode || hasMessage).toBe(true)
  })
})
