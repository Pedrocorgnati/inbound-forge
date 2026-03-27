import { describe, it, expect } from 'vitest'
import { buildUTMUrl } from '../utm'

describe('buildUTMUrl', () => {
  it('adiciona parâmetros UTM obrigatórios', () => {
    const result = buildUTMUrl('https://example.com', {
      source: 'instagram',
      medium: 'social',
      campaign: 'post-1',
    })
    expect(result).toContain('utm_source=instagram')
    expect(result).toContain('utm_medium=social')
    expect(result).toContain('utm_campaign=post-1')
  })

  it('adiciona parâmetros opcionais quando fornecidos', () => {
    const result = buildUTMUrl('https://example.com', {
      source: 'email',
      medium: 'newsletter',
      campaign: 'weekly',
      term: 'saas',
      content: 'cta-button',
    })
    expect(result).toContain('utm_term=saas')
    expect(result).toContain('utm_content=cta-button')
  })

  it('não adiciona parâmetros opcionais quando ausentes', () => {
    const result = buildUTMUrl('https://example.com', {
      source: 'blog',
      medium: 'organic',
      campaign: 'seo',
    })
    expect(result).not.toContain('utm_term')
    expect(result).not.toContain('utm_content')
  })

  it('retorna URL válida', () => {
    const result = buildUTMUrl('https://example.com/page', {
      source: 'linkedin',
      medium: 'social',
      campaign: 'launch',
    })
    expect(() => new URL(result)).not.toThrow()
  })
})
