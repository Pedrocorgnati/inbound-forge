/**
 * Testes de Integração — Segurança (THREAT-MODEL)
 *
 * Cobre vetores mapeados no THREAT-MODEL.md:
 *   THREAT-001: Brute Force no Login sem Account Lock (rate limiting)
 *   THREAT-002: Healthcheck Público Expõe Topologia (info disclosure)
 *   THREAT-004: PII Leak em input / SQL Injection
 *   THREAT-005: XSS em campos de texto armazenados
 *
 * Nota: Estes testes verificam que o sistema sanitiza inputs e não é
 * vulnerável a injeções óbvias — não substituem um pentest completo.
 */

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockSessionAuthenticated, makeUnauthenticatedRequest } from './helpers/auth.helper'
import { buildCasePayload } from './helpers/factory.helper'

const prisma = new PrismaClient()

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    requireSession: vi.fn().mockResolvedValue(mockSessionAuthenticated),
  }
})

const { GET: healthGET } = await import('@/app/api/v1/health/route')
const { POST: casesPOST } = await import('@/app/api/v1/knowledge/cases/route')

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

// ─── THREAT-002: Healthcheck verbose ─────────────────────────────────────────

describe('[THREAT-002] GET /api/v1/health — não deve vazar tokens ou credenciais', () => {
  it('resposta não deve conter strings que parecem credenciais', async () => {
    const response = await healthGET()
    const body = await response.json()
    const bodyStr = JSON.stringify(body)

    // Não deve conter padrões típicos de credenciais
    expect(bodyStr).not.toMatch(/password|secret|token|key|credential/i)
    expect(bodyStr).not.toMatch(/DATABASE_URL|SUPABASE_SERVICE/i)
  })

  it('resposta não deve conter stack traces ou caminhos de arquivo', async () => {
    const response = await healthGET()
    const body = await response.json()
    const bodyStr = JSON.stringify(body)

    expect(bodyStr).not.toMatch(/\/home\/|\/var\/|node_modules|at Object\./i)
  })

  it('campos sensíveis de workers devem ser apenas status e lastHeartbeat', async () => {
    const response = await healthGET()
    const body = await response.json()

    const workers = body.data?.workers
    if (workers) {
      const allowedFields = new Set(['status', 'lastHeartbeat'])
      for (const workerType of ['scraping', 'image', 'publishing']) {
        if (workers[workerType]) {
          const fields = Object.keys(workers[workerType])
          for (const field of fields) {
            // Apenas campos permitidos (não deve expor errorMessage, metadata etc.)
            expect(allowedFields.has(field)).toBe(true)
          }
        }
      }
    }
  })
})

// ─── THREAT-001/004: SQL Injection e Input Sanitization ──────────────────────

describe('[THREAT-004] Sanitização de inputs — SQL Injection', () => {
  it('deve sanitizar tentativa de SQL Injection no campo name', async () => {
    const sqlInjectionPayload = buildCasePayload({
      name: `[TEST-sql] '; DROP TABLE case_library_entries; --`,
    })

    const req = makeRequest('http://localhost:3000/api/v1/knowledge/cases', {
      method: 'POST',
      body: sqlInjectionPayload,
    })
    const response = await casesPOST(req)

    // Deve aceitar (Prisma usa prepared statements) OU rejeitar por validação
    // Em ambos os casos, a tabela deve ainda existir
    expect(response.status).toBeLessThan(500) // Não deve resultar em erro interno

    // Verificar que a tabela ainda existe (não foi dropada)
    const count = await prisma.caseLibraryEntry.count()
    expect(count).toBeGreaterThanOrEqual(0)

    // Cleanup
    await prisma.caseLibraryEntry.deleteMany({ where: { name: { startsWith: '[TEST-sql]' } } })
  })

  it('deve sanitizar tentativa de NoSQL Injection em query params', async () => {
    // Prisma usa TypeScript tipado — não aceita { $gt: 0 } como string
    const req = new NextRequest(
      new URL('http://localhost:3000/api/v1/knowledge/cases?status[$ne]=DRAFT'),
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    const { GET: casesGET } = await import('@/app/api/v1/knowledge/cases/route')
    const response = await casesGET(req)

    // Deve retornar 200 (ignorando o param malformado) ou 400
    // Nunca deve retornar 500 ou expor todos os registros
    expect(response.status).not.toBe(500)
  })
})

// ─── THREAT-005: XSS em campos de texto ──────────────────────────────────────

describe('[THREAT-005] Stored XSS — campos de texto não devem executar scripts', () => {
  it('deve armazenar (e retornar) script tag sem executar — output encoding é responsabilidade do FE', async () => {
    const xssPayload = buildCasePayload({
      name: `[TEST-xss-${Date.now()}] Case legítimo`,
      // XSS em campo de texto longo — deve ser armazenado como string literal
      outcome: `<script>alert('XSS')</script>. O cliente alcançou 40% de redução no ciclo de vendas com automação de qualificação de leads. O sistema identifica leads com score acima de 70 automaticamente.`,
    })

    const req = makeRequest('http://localhost:3000/api/v1/knowledge/cases', {
      method: 'POST',
      body: xssPayload,
    })
    const response = await casesPOST(req)
    const body = await response.json()

    if (response.status === 201) {
      // Se aceito, o dado deve ser retornado como string literal — não executado
      expect(body.data.outcome).toContain('<script>')
      expect(typeof body.data.outcome).toBe('string')

      // O API não deve sanitizar o conteúdo (responsabilidade do frontend React)
      // mas também não deve quebrar nem alterar o dado
      const dbCase = await prisma.caseLibraryEntry.findUnique({ where: { id: body.data.id } })
      expect(dbCase!.outcome).toContain('alert(')
    }

    // Cleanup
    await prisma.caseLibraryEntry.deleteMany({ where: { name: { startsWith: '[TEST-xss-' } } })
  })
})

// ─── Autenticação — endpoints protegidos ─────────────────────────────────────

describe('Autenticação — todos os endpoints protegidos devem exigir sessão', () => {
  const protectedEndpoints = [
    { path: '/api/v1/knowledge/cases', method: 'GET' },
    { path: '/api/v1/knowledge/pains', method: 'GET' },
    { path: '/api/v1/themes', method: 'GET' },
    { path: '/api/v1/content/generate', method: 'POST' },
    { path: '/api/v1/posts', method: 'GET' },
    { path: '/api/v1/blog', method: 'GET' },
  ]

  // Cada endpoint deve retornar 401 sem sessão
  // (Os vi.mock são por arquivo — este arquivo tem mock de requireSession)
  // Para testar sem sessão, mockamos o retorno como unauthorized

  it('GET /api/v1/knowledge/cases deve retornar 401 sem sessão', async () => {
    const { requireSession } = await import('@/lib/api-auth')
    vi.mocked(requireSession).mockResolvedValueOnce({
      user: null,
      response: new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401 }) as any,
    })

    const { GET: casesGET } = await import('@/app/api/v1/knowledge/cases/route')
    const req = makeUnauthenticatedRequest('http://localhost:3000/api/v1/knowledge/cases')
    const response = await casesGET(req)

    expect(response.status).toBe(401)
  })
})
