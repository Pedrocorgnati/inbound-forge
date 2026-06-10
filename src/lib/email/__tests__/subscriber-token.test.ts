import { describe, it, expect, beforeAll } from 'vitest'
import { mintSubscriberToken, verifySubscriberToken } from '../subscriber-token'

beforeAll(() => {
  process.env.CSRF_SECRET = process.env.CSRF_SECRET ?? 'test-secret-at-least-16-chars-long-xxxx'
})

describe('subscriber-token (HMAC confirm/unsubscribe)', () => {
  it('confirm: mint -> verify ok com mesmo subscriberId', () => {
    const tok = mintSubscriberToken('sub-1', 'confirm')
    const v = verifySubscriberToken(tok, 'confirm')
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.subscriberId).toBe('sub-1')
  })

  it('unsubscribe: token e PERMANENTE (nao expira)', () => {
    const tok = mintSubscriberToken('sub-2', 'unsubscribe', 1000)
    // 10 anos depois ainda valido
    const v = verifySubscriberToken(tok, 'unsubscribe', 1000 + 10 * 365 * 24 * 3600 * 1000)
    expect(v.ok).toBe(true)
  })

  it('confirm: expira apos 48h', () => {
    const t0 = 1_000_000
    const tok = mintSubscriberToken('sub-3', 'confirm', t0)
    const v = verifySubscriberToken(tok, 'confirm', t0 + 49 * 3600 * 1000)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe('expired')
  })

  it('rejeita purpose trocado (confirm token usado como unsubscribe)', () => {
    const tok = mintSubscriberToken('sub-4', 'confirm')
    const v = verifySubscriberToken(tok, 'unsubscribe')
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe('purpose_mismatch')
  })

  it('rejeita assinatura adulterada', () => {
    const tok = mintSubscriberToken('sub-5', 'confirm')
    const tampered = tok.slice(0, -3) + 'aaa'
    const v = verifySubscriberToken(tampered, 'confirm')
    expect(v.ok).toBe(false)
  })

  it('rejeita token malformado', () => {
    expect(verifySubscriberToken('garbage', 'confirm').ok).toBe(false)
  })
})
