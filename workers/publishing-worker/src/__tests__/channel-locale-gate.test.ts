// TQ-TST-07/08 — gate canal x locale (lado worker, espelho do app-side).
import { describe, it, expect } from 'vitest'
import { isChannelAllowedForLocale, assertChannelLocale, ChannelLocaleGateError } from '../channel-locale-gate'

describe('channel-locale-gate (publishing-worker)', () => {
  it('bloqueia canais sociais fora de pt-BR (case-insensitive)', () => {
    expect(isChannelAllowedForLocale('INSTAGRAM', 'en-US')).toBe(false)
    expect(isChannelAllowedForLocale('INSTAGRAM', 'pt-BR')).toBe(true)
    expect(isChannelAllowedForLocale('linkedin', 'it-IT')).toBe(false)
    expect(isChannelAllowedForLocale('WHATSAPP', 'es-ES')).toBe(false)
    expect(isChannelAllowedForLocale('BLOG', 'en-US')).toBe(true)
    expect(isChannelAllowedForLocale(null, 'en-US')).toBe(true)
    expect(isChannelAllowedForLocale(undefined, 'en-US')).toBe(true)
  })

  it('assertChannelLocale lanca ChannelLocaleGateError com channel/locale/name', () => {
    let caught: unknown
    try {
      assertChannelLocale('INSTAGRAM', 'en-US')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(ChannelLocaleGateError)
    expect((caught as ChannelLocaleGateError).channel).toBe('INSTAGRAM')
    expect((caught as ChannelLocaleGateError).locale).toBe('en-US')
    expect((caught as ChannelLocaleGateError).name).toBe('ChannelLocaleGateError')

    expect(() => assertChannelLocale('INSTAGRAM', 'pt-BR')).not.toThrow()
    expect(() => assertChannelLocale('BLOG', 'en-US')).not.toThrow()
  })
})
