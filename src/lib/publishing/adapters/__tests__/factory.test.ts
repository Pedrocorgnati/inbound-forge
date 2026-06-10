// TQ-TST-07/08 — factory de adapters de publishing (getAdapter/hasAdapter/list).
import { describe, it, expect } from 'vitest'
import { getAdapter, hasAdapter, listSupportedChannels, UnknownChannelError } from '@/lib/publishing/adapters'

describe('publishing adapters factory', () => {
  it('resolve BLOG/INSTAGRAM/LINKEDIN (case-insensitive)', () => {
    expect(getAdapter('BLOG').channel).toBe('BLOG')
    expect(getAdapter('INSTAGRAM').channel).toBe('INSTAGRAM')
    expect(getAdapter('LINKEDIN').channel).toBe('LINKEDIN')
    expect(getAdapter('blog').channel).toBe('BLOG')
  })

  it('lanca UnknownChannelError para canais fora do MVP', () => {
    expect(() => getAdapter('TIKTOK')).toThrow(UnknownChannelError)
    expect(() => getAdapter('YOUTUBE')).toThrow(UnknownChannelError)
    expect(() => getAdapter('WHATSAPP')).toThrow(UnknownChannelError)
    expect(() => getAdapter('FOO')).toThrow(UnknownChannelError)

    let caught: unknown
    try {
      getAdapter('TIKTOK')
    } catch (e) {
      caught = e
    }
    expect((caught as UnknownChannelError).channel).toBe('TIKTOK')
  })

  it('hasAdapter e listSupportedChannels refletem o registry MVP', () => {
    expect(hasAdapter('BLOG')).toBe(true)
    expect(hasAdapter('blog')).toBe(true)
    expect(hasAdapter('TIKTOK')).toBe(false)
    expect(listSupportedChannels().sort()).toEqual(['BLOG', 'INSTAGRAM', 'LINKEDIN'])
  })
})
