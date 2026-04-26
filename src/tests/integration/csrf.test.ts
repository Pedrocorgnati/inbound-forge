import { describe, it, expect, beforeAll } from 'vitest'
import { generateCsrfToken, verifyCsrfToken, CSRF_COOKIE_NAME, TOKEN_TTL_MS } from '@/lib/csrf'

beforeAll(() => {
  process.env.CSRF_SECRET = 'test-secret-test-secret-test-secret-12345'
})

describe('csrf', () => {
  it('generates valid token with HMAC bound to sessionId', () => {
    const sid = 'user-abc'
    const token = generateCsrfToken(sid)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
    expect(verifyCsrfToken(token, sid)).toBe(true)
  })

  it('rejects token with different sessionId', () => {
    const token = generateCsrfToken('user-aaa')
    expect(verifyCsrfToken(token, 'user-bbb')).toBe(false)
  })

  it('rejects expired token (>24h)', () => {
    const past = Date.now() - TOKEN_TTL_MS - 1000
    const token = generateCsrfToken('user-x', past)
    expect(verifyCsrfToken(token, 'user-x')).toBe(false)
  })

  it('rejects malformed token', () => {
    expect(verifyCsrfToken('not-a-valid-token', 'user-x')).toBe(false)
  })

  it('exports COOKIE name and TTL constants', () => {
    expect(CSRF_COOKIE_NAME).toBe('x-csrf-token')
    expect(TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})
