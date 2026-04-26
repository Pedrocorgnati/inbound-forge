import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    blogArticle: {
      findMany: vi.fn(),
    },
    blogArticleTranslation: {
      findMany: vi.fn(),
    },
  },
}))

import { buildSitemap } from '@/lib/seo/sitemap-builder'
import { prisma } from '@/lib/prisma'

const mockedFindMany = (model: 'blogArticle' | 'blogArticleTranslation') =>
  (prisma as unknown as Record<string, { findMany: ReturnType<typeof vi.fn> }>)[model].findMany

describe('buildSitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes static routes for all locales', async () => {
    mockedFindMany('blogArticle').mockResolvedValue([])
    mockedFindMany('blogArticleTranslation').mockResolvedValue([])

    const entries = await buildSitemap('https://example.com')
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://example.com/pt-BR')
    expect(urls).toContain('https://example.com/pt-BR/blog')
    expect(urls).toContain('https://example.com/pt-BR/privacy')

    const root = entries.find((e) => e.url === 'https://example.com/pt-BR')
    expect(root?.alternates?.languages).toMatchObject({
      'pt-BR': 'https://example.com/pt-BR',
      'en-US': 'https://example.com/en-US',
      'it-IT': 'https://example.com/it-IT',
      'es-ES': 'https://example.com/es-ES',
      'x-default': 'https://example.com/pt-BR',
    })
  })

  it('emits hreflang alternates for translated articles', async () => {
    mockedFindMany('blogArticle').mockResolvedValue([
      { id: 'a1', slug: 'how-to-x', updatedAt: new Date('2026-04-01') },
    ])
    mockedFindMany('blogArticleTranslation').mockResolvedValue([
      { articleId: 'a1', locale: 'en-US', slug: 'how-to-x-en' },
      { articleId: 'a1', locale: 'it-IT', slug: 'come-fare-x' },
    ])

    const entries = await buildSitemap('https://example.com')
    const article = entries.find((e) => e.url === 'https://example.com/pt-BR/blog/how-to-x')
    expect(article).toBeDefined()
    expect(article?.alternates?.languages?.['en-US']).toBe('https://example.com/en-US/blog/how-to-x-en')
    expect(article?.alternates?.languages?.['it-IT']).toBe('https://example.com/it-IT/blog/come-fare-x')
  })

  it('omits unpublished articles (where filter is PUBLISHED)', async () => {
    mockedFindMany('blogArticle').mockResolvedValue([])
    mockedFindMany('blogArticleTranslation').mockResolvedValue([])
    const entries = await buildSitemap('https://example.com')
    const blogArticleEntries = entries.filter((e) => e.url.includes('/blog/'))
    expect(blogArticleEntries).toHaveLength(0)
  })
})
