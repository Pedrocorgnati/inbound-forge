/**
 * API Contract Tests — Knowledge Base (module-5)
 * Rastreabilidade: MILESTONE-5, G-004
 *
 * Testes de integração para os endpoints CRUD de cases, pains, patterns e objections.
 * Requer app rodando em processo separado ou supertest em CI.
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

async function apiRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// --- Cases ---

describe('Knowledge API — Cases', () => {
  it('GET /api/knowledge/cases — retorna lista paginada', async () => {
    const res = await apiRequest('GET', '/api/knowledge/cases')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /api/knowledge/cases — cria case com campos obrigatorios', async () => {
    const res = await apiRequest('POST', '/api/knowledge/cases', {
      name: 'Test Case Integration',
      sector: 'Tecnologia',
      systemType: 'CRM',
      outcome: 'O cliente triplicou as vendas em 3 meses com automação de follow-up personalizado',
      hasQuantifiableResult: true,
      isDraft: true,
    })
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body.data?.name ?? body.name).toBe('Test Case Integration')
  })

  it('POST /api/knowledge/cases — rejeita sem nome (validacao Zod)', async () => {
    const res = await apiRequest('POST', '/api/knowledge/cases', {
      sector: 'Tecnologia',
      systemType: 'CRM',
      outcome: 'Resultado',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// --- Pains ---

describe('Knowledge API — Pains', () => {
  it('GET /api/knowledge/pains — retorna lista paginada', async () => {
    const res = await apiRequest('GET', '/api/knowledge/pains')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /api/knowledge/pains — cria pain com campos obrigatorios', async () => {
    const res = await apiRequest('POST', '/api/knowledge/pains', {
      title: 'Test Pain Integration',
      description: 'Descricao detalhada da dor operacional para testes de integracao',
      sectors: ['operational_time'],
    })
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body.data?.title ?? body.title).toBe('Test Pain Integration')
  })

  it('POST /api/knowledge/pains — rejeita com titulo curto', async () => {
    const res = await apiRequest('POST', '/api/knowledge/pains', {
      title: 'ab',
      description: 'Descricao valida',
      sectors: [],
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// --- Patterns ---

describe('Knowledge API — Patterns', () => {
  it('GET /api/knowledge/patterns — retorna lista paginada', async () => {
    const res = await apiRequest('GET', '/api/knowledge/patterns')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /api/knowledge/patterns — rejeita sem painId', async () => {
    const res = await apiRequest('POST', '/api/knowledge/patterns', {
      name: 'Test Pattern',
      description: 'Descricao do padrao de solucao para teste de integracao',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// --- Objections ---

describe('Knowledge API — Objections', () => {
  it('GET /api/knowledge/objections — retorna lista paginada', async () => {
    const res = await apiRequest('GET', '/api/knowledge/objections')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('POST /api/knowledge/objections — cria objecao', async () => {
    const res = await apiRequest('POST', '/api/knowledge/objections', {
      content: 'Inbound marketing demora muito para dar resultado',
      type: 'TIMING',
    })
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body.data?.type ?? body.type).toBe('TIMING')
  })

  it('POST /api/knowledge/objections — rejeita conteudo curto', async () => {
    const res = await apiRequest('POST', '/api/knowledge/objections', {
      content: 'ab',
      type: 'PRICE',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

// --- Progress / Threshold ---

describe('Knowledge API — Threshold', () => {
  it('GET /api/knowledge/progress — retorna progresso com thresholds', async () => {
    const res = await apiRequest('GET', '/api/knowledge/progress')
    expect(res.status).toBe(200)
    const body = await res.json()
    const data = body.data ?? body
    expect(data).toHaveProperty('cases')
    expect(data.cases).toHaveProperty('threshold')
    expect(data.cases.threshold).toBe(5)
  })
})
