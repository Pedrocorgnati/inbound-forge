// Module-11: Blog Service — leitura pública de artigos
// Rastreabilidade: INT-067, FEAT-publishing-blog-001, NEXT-002

import { prisma } from '@/lib/prisma'
import type { BlogArticle, HreflangConfig, PaginatedArticleSummaries } from '@/types/blog'

const DEFAULT_PAGE_LIMIT = 6

/** Seleciona campos públicos de artigos (sem body completo para listagem) */
const publicListSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  featuredImageUrl: true,
  coverImageAlt: true,
  metaTitle: true,
  metaDescription: true,
  tags: true,
  status: true,
  authorName: true,
  publishedAt: true,
  updatedAt: true,
  createdAt: true,
} as const

/** Seleciona campos completos para página do artigo */
const publicFullSelect = {
  ...publicListSelect,
  body: true,
  canonicalUrl: true,
  schemaTypes: true,
  hreflang: true,
  ctaType: true,
  ctaUrl: true,
  ctaLabel: true,
  currentVersion: true,
  approvedAt: true,
} as const

/**
 * Lista artigos PUBLISHED com paginação, sem body completo.
 * Rastreabilidade: FEAT-publishing-blog-001
 */
export async function listPublished(
  page = 1,
  limit = DEFAULT_PAGE_LIMIT,
): Promise<PaginatedArticleSummaries> {
  const skip = (page - 1) * limit

  const [items, total] = await prisma.$transaction([
    prisma.blogArticle.findMany({
      where: { status: 'PUBLISHED' },
      select: publicListSelect,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blogArticle.count({ where: { status: 'PUBLISHED' } }),
  ])

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Retorna artigo PUBLISHED por slug para rota pública.
 * Tenta primeiro pelo slug principal (BlogArticle.slug), depois pelo slug traduzido
 * (BlogArticleTranslation.slug com status APPROVED) — suporta hreflang com slugs distintos por locale.
 * Retorna null se não existir ou não for PUBLISHED (BLOG_080).
 */
export async function findBySlug(slug: string): Promise<BlogArticle | null> {
  const article = await prisma.blogArticle.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: publicFullSelect,
  })
  if (article) return { ...article, hreflang: article.hreflang as HreflangConfig | null }

  // Fallback: slug pode pertencer a uma tradução aprovada (M10.15 — hreflang com slug próprio)
  const translation = await (prisma as unknown as {
    blogArticleTranslation: {
      findFirst: (args: unknown) => Promise<{ articleId: string } | null>
    }
  }).blogArticleTranslation.findFirst({
    where: { slug, status: 'APPROVED' },
    select: { articleId: true },
  }).catch(() => null)

  if (!translation?.articleId) return null

  const parent = await prisma.blogArticle.findFirst({
    where: { id: translation.articleId, status: 'PUBLISHED' },
    select: publicFullSelect,
  })
  if (!parent) return null
  return { ...parent, hreflang: parent.hreflang as HreflangConfig | null }
}

/**
 * Retorna artigo por slug sem filtro de status — para uso admin.
 * Rastreabilidade: FEAT-publishing-blog-001
 */
export async function findBySlugAdmin(slug: string): Promise<BlogArticle | null> {
  const article = await prisma.blogArticle.findFirst({
    where: { slug },
    select: publicFullSelect,
  })
  if (!article) return null
  return { ...article, hreflang: article.hreflang as HreflangConfig | null }
}

/**
 * TASK-21 ST001 (CL-287): checa status de um slug para diferenciar
 * DELETED (410 Gone) de realmente inexistente (404).
 */
export async function findStatusBySlug(slug: string): Promise<string | null> {
  const row = await prisma.blogArticle.findFirst({
    where: { slug },
    select: { status: true },
  })
  return row?.status ?? null
}

/**
 * Retorna apenas slugs dos artigos publicados.
 * Usado em generateStaticParams e sitemap.
 */
export async function listPublishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.blogArticle.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
  })
}

/**
 * Lista artigos publicados filtrados por tag.
 * Rastreabilidade: CL-150, TASK-6 ST002
 */
export async function listByTag(
  tag: string,
  page = 1,
  limit = DEFAULT_PAGE_LIMIT
): Promise<PaginatedArticleSummaries> {
  const skip = (page - 1) * limit

  const [items, total] = await prisma.$transaction([
    prisma.blogArticle.findMany({
      where: { status: 'PUBLISHED', tags: { has: tag } },
      select: publicListSelect,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blogArticle.count({ where: { status: 'PUBLISHED', tags: { has: tag } } }),
  ])

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Retorna todas as tags unicas dos artigos publicados, ordenadas por frequencia.
 * Rastreabilidade: CL-150, TASK-6 ST003
 */
export async function listAllTags(): Promise<Array<{ tag: string; count: number }>> {
  const articles = await prisma.blogArticle.findMany({
    where: { status: 'PUBLISHED' },
    select: { tags: true },
  })

  const freq = new Map<string, number>()
  for (const article of articles) {
    for (const tag of article.tags) {
      freq.set(tag, (freq.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Intake-Review TASK-4 (CL-302): busca server-side em artigos publicados.
 * Matching case-insensitive em title/excerpt/tags.
 */
export async function search(
  query: string,
  page = 1,
  limit = DEFAULT_PAGE_LIMIT,
): Promise<PaginatedArticleSummaries> {
  const q = query.trim()
  if (!q) {
    return { items: [], total: 0, page, limit, totalPages: 0 }
  }

  const skip = (page - 1) * limit
  const where = {
    status: 'PUBLISHED' as const,
    OR: [
      { title: { contains: q, mode: 'insensitive' as const } },
      { excerpt: { contains: q, mode: 'insensitive' as const } },
      { metaDescription: { contains: q, mode: 'insensitive' as const } },
      { tags: { has: q.toLowerCase() } },
    ],
  }

  const [items, total] = await prisma.$transaction([
    prisma.blogArticle.findMany({
      where,
      select: publicListSelect,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.blogArticle.count({ where }),
  ])

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Intake-Review TASK-4 (CL-303): ultimos N artigos publicados para RSS/Atom feed.
 * Retorna body, excerpt e metadata suficientes para construir <item>.
 */
export async function listForRss(limit = 20) {
  return prisma.blogArticle.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      metaDescription: true,
      authorName: true,
      publishedAt: true,
      updatedAt: true,
      tags: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}

export const blogService = {
  listPublished,
  listByTag,
  listAllTags,
  findBySlug,
  findBySlugAdmin,
  findStatusBySlug,
  listPublishedSlugs,
  search,
  listForRss,
}
