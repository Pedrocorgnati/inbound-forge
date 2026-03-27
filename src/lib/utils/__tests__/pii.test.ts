import { describe, it, expect, beforeAll } from 'vitest'
import { encryptPII, decryptPII, maskPII } from '../pii'

beforeAll(() => {
  // Define a test key — NEVER use this in production
  // Must be 32 bytes (256 bits) base64-encoded
  process.env.PII_ENCRYPTION_KEY = Buffer.from('0'.repeat(32)).toString('base64')
})

describe('encryptPII / decryptPII', () => {
  it('round-trip para string simples', () => {
    const value = 'pedro@example.com'
    const encrypted = encryptPII(value)
    expect(encrypted).not.toBe(value)
    expect(decryptPII(encrypted)).toBe(value)
  })

  it('round-trip para string UTF-8 com acentos', () => {
    const value = 'João da Silva'
    expect(decryptPII(encryptPII(value))).toBe(value)
  })

  it('valores criptografados são diferentes a cada chamada (IV aleatório)', () => {
    const value = 'test@test.com'
    const enc1 = encryptPII(value)
    const enc2 = encryptPII(value)
    expect(enc1).not.toBe(enc2)
  })
})

describe('maskPII', () => {
  it('mascara e-mail mantendo primeiro char e domínio', () => {
    expect(maskPII('pedro@test.com')).toBe('p***@test.com')
  })

  it('mascara valor não-email mantendo 3 primeiros chars', () => {
    expect(maskPII('11999999999')).toBe('119***')
  })

  it('nunca expõe valor completo', () => {
    const result = maskPII('usuario@dominio.com.br')
    expect(result).not.toBe('usuario@dominio.com.br')
    expect(result).toContain('***')
  })
})
