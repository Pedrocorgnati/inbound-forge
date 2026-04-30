/**
 * Testes — Middleware CSP/Nonce
 * Rastreabilidade: TASK-11/ST004 (Problema B — CSP nonce sem validação)
 * Valida que o middleware gera nonce único e injeta no header Content-Security-Policy
 */

import { vi, describe, it, expect, beforeAll } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@test.com' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('@/lib/rate-limit/blog-public', () => ({
  checkBlogPublicRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0, remaining: 60 }),
  extractClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/auth/csrf-token', () => ({
  verifyCsrfToken: vi.fn().mockReturnValue(true),
  readCsrfFromRequest: vi.fn().mockReturnValue({ header: null, cookie: null }),
}))

vi.mock('@/lib/auth/callback-validation', () => ({
  validateCallbackUrl: vi.fn().mockReturnValue({ sanitized: '/pt-BR/dashboard' }),
}))

import { NextRequest } from 'next/server'
import { middleware } from './middleware'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key'
})

describe('Middleware — CSP Nonce (SEC)', () => {
  it('injeta nonce válido no header Content-Security-Policy', async () => {
    const req = new NextRequest('http://localhost/pt-BR/dashboard', {
      headers: { cookie: 'sb-access-token=mock-token; inbound_forge_onboarded=1' },
    })
    const res = await middleware(req)
    const csp = res.headers.get('Content-Security-Policy') ?? ''
    expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/)
  })

  it('injeta x-nonce no header da response', async () => {
    const req = new NextRequest('http://localhost/pt-BR/dashboard', {
      headers: { cookie: 'sb-access-token=mock-token; inbound_forge_onboarded=1' },
    })
    const res = await middleware(req)
    const nonce = res.headers.get('x-nonce')
    expect(nonce).toBeTruthy()
    expect(nonce?.length).toBeGreaterThan(10)
  })

  it('gera nonce único a cada request', async () => {
    const req1 = new NextRequest('http://localhost/pt-BR/login')
    const req2 = new NextRequest('http://localhost/pt-BR/login')
    const [res1, res2] = await Promise.all([middleware(req1), middleware(req2)])
    const nonce1 = res1.headers.get('x-nonce')
    const nonce2 = res2.headers.get('x-nonce')
    expect(nonce1).not.toBeNull()
    expect(nonce1).not.toBe(nonce2)
  })

  it('inclui CSP em rotas públicas também (consistência)', async () => {
    const req = new NextRequest('http://localhost/pt-BR/login')
    const res = await middleware(req)
    const csp = res.headers.get('Content-Security-Policy') ?? ''
    expect(csp).toContain('script-src')
  })
})
