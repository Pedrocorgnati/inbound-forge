/**
 * TASK-3 ST001 — TDD anti-bot detector
 */
import { describe, it, expect } from 'vitest'
import { detectAntiBot } from '../anti-bot-detector'

describe('detectAntiBot', () => {
  it('detecta HTTP 403 como bloqueio', () => {
    const r = detectAntiBot({ status: 403 })
    expect(r.isBlocked).toBe(true)
    expect(r.reason).toMatch(/403/)
  })

  it('detecta HTTP 429 (rate limit) como bloqueio', () => {
    const r = detectAntiBot({ status: 429 })
    expect(r.isBlocked).toBe(true)
  })

  it('detecta Cloudflare via header cf-mitigated', () => {
    const r = detectAntiBot({
      status: 200,
      headers: { 'cf-mitigated': 'challenge' },
    })
    expect(r.isBlocked).toBe(true)
    expect(r.reason?.toLowerCase()).toContain('cloudflare')
  })

  it('detecta DataDome via header dedicado', () => {
    const r = detectAntiBot({ status: 200, headers: { 'x-datadome': 'blocked' } })
    expect(r.isBlocked).toBe(true)
  })

  it('detecta captcha presente no body', () => {
    const r = detectAntiBot({
      status: 200,
      bodyExcerpt: '<div>Please complete the CAPTCHA to continue</div>',
    })
    expect(r.isBlocked).toBe(true)
  })

  it('detecta redirect para login (30x + Location)', () => {
    const r = detectAntiBot({
      status: 302,
      headers: { location: 'https://example.com/login?next=/article' },
    })
    expect(r.isBlocked).toBe(true)
    expect(r.reason).toMatch(/login/i)
  })

  it('retorna nao-bloqueado para 200 normal', () => {
    const r = detectAntiBot({
      status: 200,
      headers: { 'content-type': 'text/html' },
      bodyExcerpt: '<html><body><article>Texto livre</article></body></html>',
    })
    expect(r.isBlocked).toBe(false)
    expect(r.reason).toBeNull()
  })

  it('nao bloqueia header server sem marker conhecido', () => {
    const r = detectAntiBot({ status: 200, headers: { server: 'nginx/1.21' } })
    expect(r.isBlocked).toBe(false)
  })

  it('bloqueia quando server header indica cloudflare', () => {
    const r = detectAntiBot({ status: 200, headers: { server: 'cloudflare' } })
    expect(r.isBlocked).toBe(true)
  })
})
