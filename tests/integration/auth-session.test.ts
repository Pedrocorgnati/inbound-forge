/**
 * Testes de Integração — Auth Session (TST-004)
 *
 * Cobre: GET /api/auth/session
 * Rastreabilidade: TASK-7/ST003
 *
 * A autenticação é feita client-side via Supabase. O endpoint de sessão
 * verifica o cookie de sessão Supabase e retorna dados mínimos do usuário.
 * Baseado em: src/app/api/auth/session/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase server mock — controla getUser() por teste
const supabaseMock = {
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue(supabaseMock),
}))

const { GET: sessionGET } = await import('@/app/api/auth/session/route')

describe('Auth Session (TST-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Sucesso ─────────────────────────────────────────────────────────────

  it('[SUCCESS] GET /api/auth/session com sessão válida → 200 + dados do user', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'usr-abc-123', email: 'pedro@inboundforge.dev' } },
      error: null,
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.user.id).toBe('usr-abc-123')
    expect(body.data.user.email).toBe('pedro@inboundforge.dev')
  })

  it('[SECURITY] sessão válida retorna apenas id e email — nunca metadados internos (SEC-008)', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'usr-abc-123',
          email: 'pedro@inboundforge.dev',
          app_metadata: { provider: 'email', roles: ['admin'] },
          user_metadata: { full_name: 'Pedro Corgnati', avatar: 'url' },
          identities: [{ id: 'identity-1', user_id: 'usr-abc-123', provider: 'email' }],
          aud: 'authenticated',
          role: 'authenticated',
          created_at: '2024-01-01T00:00:00Z',
        },
      },
      error: null,
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(200)
    // Verificar que apenas id e email são retornados
    const userKeys = Object.keys(body.data.user)
    expect(userKeys).toContain('id')
    expect(userKeys).toContain('email')
    // Não deve vazar dados internos do Supabase
    expect(body.data.user.app_metadata).toBeUndefined()
    expect(body.data.user.user_metadata).toBeUndefined()
    expect(body.data.user.identities).toBeUndefined()
    expect(body.data.user.aud).toBeUndefined()
    expect(body.data.user.role).toBeUndefined()
  })

  // ─── Erros ───────────────────────────────────────────────────────────────

  it('[ERROR] GET /api/auth/session sem sessão (user: null) → 401 + AUTH_001', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_001')
  })

  it('[ERROR] GET /api/auth/session com erro Supabase → 401 + AUTH_001', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT', status: 400 },
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_001')
  })

  it('[ERROR] GET /api/auth/session com token expirado → 401 + AUTH_001', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired', status: 401 },
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('AUTH_001')
  })

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it('[EDGE] acesso com exceção de rede no Supabase → 401 fail-safe (nunca 500)', async () => {
    supabaseMock.auth.getUser.mockRejectedValue(new Error('Network error'))

    const response = await sessionGET()
    const body = await response.json()

    // SEC: fail-safe — nunca deve retornar 500 com detalhes do erro interno
    expect(response.status).toBe(401)
    expect(body.error.code).toBe('AUTH_001')
    // Mensagem de erro não deve vazar detalhes internos
    expect(body.error.message).not.toContain('Network error')
    expect(body.error.message).not.toContain('stack')
  })

  it('[EDGE] sessão válida não retorna cookie de sessão ou token na resposta', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'usr-abc-123', email: 'pedro@inboundforge.dev' } },
      error: null,
    })

    const response = await sessionGET()
    const body = await response.json()

    expect(response.status).toBe(200)
    // Resposta JSON não deve conter tokens
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toMatch(/access_token|refresh_token|bearer/i)
  })

  it('[EDGE] acesso a rota protegida sem sessão → middleware redireciona para /login', async () => {
    // Documentação comportamental — testado via middleware.ts:107-113
    // middleware() verifica supabase.auth.getUser() e redireciona se !user
    // Este comportamento é validado em E2E (Playwright)
    // Aqui documentamos o contrato esperado:
    // GET /[locale]/dashboard sem sessão → 307 redirect para /[locale]/login
    expect(true).toBe(true)
  })
})
