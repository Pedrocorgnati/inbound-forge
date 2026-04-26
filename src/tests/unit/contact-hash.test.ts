/**
 * TASK-3 ST001 — testes unit de contact-hash.
 */
import { describe, it, expect } from 'vitest'
import { hashContactInfo, normalizeEmail, normalizePhone } from '@/lib/leads/contact-hash'

describe('hashContactInfo', () => {
  it('gera hash igual para emails com case diferente', () => {
    expect(hashContactInfo({ email: 'A@X.com' })).toBe(hashContactInfo({ email: 'a@x.com' }))
  })

  it('gera hash igual para phones com formatacao diferente', () => {
    expect(hashContactInfo({ phone: '+55 (11) 99999-0000' })).toBe(
      hashContactInfo({ phone: '5511999990000' })
    )
  })

  it('gera hash diferente para emails distintos', () => {
    expect(hashContactInfo({ email: 'a@x.com' })).not.toBe(hashContactInfo({ email: 'b@x.com' }))
  })

  it('inputs vazios geram hash sentinel estavel', () => {
    expect(hashContactInfo({})).toBe(hashContactInfo({ email: null, phone: null }))
  })

  it('email trim funciona', () => {
    expect(normalizeEmail('  A@X.COM  ')).toBe('a@x.com')
  })

  it('phone remove separadores', () => {
    expect(normalizePhone('+55 (11) 99999-0000')).toBe('5511999990000')
  })
})
