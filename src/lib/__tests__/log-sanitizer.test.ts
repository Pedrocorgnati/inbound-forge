/**
 * log-sanitizer.test.ts
 * Rastreabilidade: SEC-008, TASK-4/ST003
 */
import { describe, it, expect } from 'vitest'
import { sanitizeForLog, PII_FIELDS } from '@/lib/log-sanitizer'

describe('sanitizeForLog — campos PII mascarados', () => {
  it('mascara contactInfo em objeto simples', () => {
    const input = { id: '123', contactInfo: 'João Silva', status: 'ACTIVE' }
    const result = sanitizeForLog(input) as Record<string, unknown>
    expect(result.contactInfo).toBe('[REDACTED]')
    expect(result.id).toBe('123')
    expect(result.status).toBe('ACTIVE')
  })

  it('mascara email', () => {
    const input = { id: '456', email: 'joao@example.com', role: 'OPERATOR' }
    const result = sanitizeForLog(input) as Record<string, unknown>
    expect(result.email).toBe('[REDACTED]')
    expect(result.role).toBe('OPERATOR')
  })

  it('mascara phone, password, apiKey, token, secret', () => {
    const input = {
      phone: '11999999999',
      password: 'super_secret',
      apiKey: 'sk-test-123',
      token: 'bearer_abc',
      secret: 'jwt_secret',
    }
    const result = sanitizeForLog(input) as Record<string, unknown>
    for (const key of Object.keys(input)) {
      expect(result[key]).toBe('[REDACTED]')
    }
  })

  it('mascara campos PII em objetos aninhados (recursivo)', () => {
    const input = {
      lead: {
        id: 'lead-123',
        contactInfo: 'Maria Costa',
        meta: {
          email: 'maria@example.com',
        },
      },
    }
    const result = sanitizeForLog(input) as Record<string, unknown>
    const lead = result.lead as Record<string, unknown>
    expect(lead.id).toBe('lead-123')
    expect(lead.contactInfo).toBe('[REDACTED]')
    const meta = lead.meta as Record<string, unknown>
    expect(meta.email).toBe('[REDACTED]')
  })

  it('mascara campos PII em arrays de objetos', () => {
    const input = [
      { id: '1', email: 'a@b.com', status: 'ok' },
      { id: '2', email: 'c@d.com', status: 'ok' },
    ]
    const result = sanitizeForLog(input) as Array<Record<string, unknown>>
    expect(result[0].email).toBe('[REDACTED]')
    expect(result[1].email).toBe('[REDACTED]')
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('preserva campos não-PII intactos', () => {
    const input = {
      id: 'abc',
      status: 'ACTIVE',
      createdAt: '2026-03-26',
      count: 42,
      active: true,
    }
    const result = sanitizeForLog(input) as Record<string, unknown>
    expect(result).toEqual(input)
  })

  it('trata null/undefined sem erro', () => {
    expect(sanitizeForLog(null)).toBeNull()
    expect(sanitizeForLog(undefined)).toBeUndefined()
  })

  it('trata string primitiva sem alterar', () => {
    expect(sanitizeForLog('hello')).toBe('hello')
  })

  it('PII_FIELDS contém todos os campos esperados', () => {
    const expected = ['contactInfo', 'email', 'phone', 'password', 'apiKey', 'token', 'secret']
    for (const field of expected) {
      expect(PII_FIELDS.has(field)).toBe(true)
    }
  })
})
