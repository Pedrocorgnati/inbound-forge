// Module-11: Blog SEO/GEO — Tipos TypeScript
// Rastreabilidade: INT-067, INT-096, FEAT-publishing-blog-001

import type { ArticleStatus, CTADestination } from '@prisma/client'

export interface BlogArticle {
  id: string
  contentPieceId?: string | null
  slug: string
  title: string
  excerpt: string
  body: string
  featuredImageUrl?: string | null // coluna "featured_image_url" no banco
  coverImageAlt?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
  schemaTypes: string[]
  hreflang?: HreflangConfig | null
  tags: string[]
  status: ArticleStatus
  authorName: string
  ctaType?: CTADestination | null
  ctaUrl?: string | null
  ctaLabel?: string | null
  currentVersion: number
  approvedAt?: Date | null
  approvedBy?: string | null
  publishedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  versions?: BlogArticleVersion[]
}

export interface BlogArticleVersion {
  id: string
  articleId: string
  versionNumber: number
  title: string
  body: string
  changeNote?: string | null
  createdAt: Date
}

export interface CTAConfig {
  type: CTADestination
  url: string
  label: string
}

/** Mapeamento locale → URL canônica do artigo naquele idioma */
export interface HreflangConfig {
  [locale: string]: string
}

export interface JsonLdConfig {
  types: ('BlogPosting' | 'FAQPage' | 'HowTo')[]
  schemaData: Record<string, unknown>
}

export type ArticleStatusType = ArticleStatus

/** Resposta paginada de artigos */
export interface PaginatedArticles {
  items: BlogArticle[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Campos de artigo retornados pela listagem pública (publicListSelect).
 * Não inclui body, hreflang, canonicalUrl, schemaTypes, cta*, currentVersion, approvedAt.
 */
export type BlogArticleSummary = Pick<
  BlogArticle,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'featuredImageUrl'
  | 'coverImageAlt'
  | 'metaTitle'
  | 'metaDescription'
  | 'tags'
  | 'status'
  | 'authorName'
  | 'publishedAt'
  | 'updatedAt'
  | 'createdAt'
>

/** Resposta paginada da listagem pública de artigos (campos parciais) */
export interface PaginatedArticleSummaries {
  items: BlogArticleSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}
