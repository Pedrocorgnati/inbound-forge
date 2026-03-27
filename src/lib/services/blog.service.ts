// Module-11: Blog Service — leitura pública de artigos
// Rastreabilidade: INT-067, FEAT-publishing-blog-001, NEXT-002

import { prisma } from '@/lib/prisma'
import type { BlogArticle, PaginatedArticles } from '@/types/blog'

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
): Promise<PaginatedArticles> {
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
    items: items as unknown as BlogArticle[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Retorna artigo PUBLISHED por slug para rota pública.
 * Retorna null se não existir ou não for PUBLISHED (BLOG_080).
 */
export async function findBySlug(slug: string): Promise<BlogArticle | null> {
  const article = await prisma.blogArticle.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: publicFullSelect,
  })

  return article as unknown as BlogArticle | null
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

  return article as unknown as BlogArticle | null
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

export const blogService = {
  listPublished,
  findBySlug,
  findBySlugAdmin,
  listPublishedSlugs,
}
