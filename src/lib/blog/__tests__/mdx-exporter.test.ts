/**
 * TASK-8 ST001 — TDD MDX exporter
 */
import { describe, it, expect } from 'vitest'
import { exportArticleAsMdx } from '../mdx-exporter'

const seedArticle = {
  id: 'art-1',
  slug: 'como-criar-conteudo',
  title: 'Como criar conteudo de qualidade',
  excerpt: 'Aprenda a criar conteudo que converte.',
  body: '<h2>Introducao</h2><p>Conteudo e rei.</p>',
  featuredImageUrl: 'https://cdn.supabase.co/img/cover.jpg',
  tags: ['marketing', 'conteudo'],
  authorName: 'Pedro Corgnati',
  canonicalUrl: null,
  publishedAt: new Date('2026-01-15'),
}

describe('exportArticleAsMdx', () => {
  it('frontmatter contem campos obrigatorios', () => {
    const mdx = exportArticleAsMdx(seedArticle)
    expect(mdx).toMatch(/^---\n/)
    expect(mdx).toMatch(/title:/)
    expect(mdx).toMatch(/date:/)
    expect(mdx).toMatch(/locale:/)
    expect(mdx).toMatch(/canonical:/)
    expect(mdx).toMatch(/author:/)
    expect(mdx).toMatch(/tags:/)
  })

  it('inclui a data de publicacao corretamente', () => {
    const mdx = exportArticleAsMdx(seedArticle)
    expect(mdx).toContain('date: "2026-01-15"')
  })

  it('usa data corrente quando publishedAt e null', () => {
    const mdx = exportArticleAsMdx({ ...seedArticle, publishedAt: null })
    const today = new Date().toISOString().split('T')[0]
    expect(mdx).toContain(`date: "${today}"`)
  })

  it('fecha frontmatter antes do body', () => {
    const mdx = exportArticleAsMdx(seedArticle)
    const lines = mdx.split('\n')
    const firstDash = lines.indexOf('---')
    const secondDash = lines.indexOf('---', firstDash + 1)
    expect(firstDash).toBe(0)
    expect(secondDash).toBeGreaterThan(firstDash)
    // Corpo começa depois do segundo ---
    expect(mdx.split('---\n\n')[1]).toBeTruthy()
  })

  it('converte h2 para markdown heading', () => {
    const mdx = exportArticleAsMdx(seedArticle)
    expect(mdx).toContain('## Introducao')
  })

  it('usa locale fornecido no canonical', () => {
    const mdx = exportArticleAsMdx(seedArticle, 'en-US')
    expect(mdx).toContain('locale: "en-US"')
    expect(mdx).toContain('en-US/blog/como-criar-conteudo')
  })
})
