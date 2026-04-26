// Module-11: E-E-A-T Metadata Builder
// Rastreabilidade: TASK-3 ST004, INT-102, FEAT-publishing-blog-004
// E-E-A-T = Experience, Expertise, Authoritativeness, Trustworthiness

import type { BlogArticle } from '@/types/blog'
import { DEFAULT_AUTHOR_CREDENTIALS } from '@/lib/blog/schema-ld'

export interface EEATMetadata {
  author: {
    name: string
    url: string
    jobTitle: string
    knowsAbout: string[]
    sameAs: string[]
    description: string
  }
  reviewedAt?: string
  contentType: 'original'
}

function readArticleCredentials(article: BlogArticle): {
  jobTitle?: string
  description?: string
  knowsAbout?: string[]
  sameAs?: string[]
  url?: string
} {
  // TASK-7 ST001 (CL-200): honrar authorCredentials do artigo quando presente.
  const raw = (article as unknown as { authorCredentials?: unknown }).authorCredentials
  if (!raw || typeof raw !== 'object') return {}
  const record = raw as Record<string, unknown>
  return {
    jobTitle: typeof record.jobTitle === 'string' ? record.jobTitle : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    url: typeof record.url === 'string' ? record.url : undefined,
    knowsAbout: Array.isArray(record.knowsAbout)
      ? record.knowsAbout.filter((x): x is string => typeof x === 'string')
      : undefined,
    sameAs: Array.isArray(record.sameAs)
      ? record.sameAs.filter((x): x is string => typeof x === 'string')
      : undefined,
  }
}

/**
 * Constrói metadados E-E-A-T para o artigo.
 * reviewedAt usa approvedAt (aprovação humana = credibilidade de revisão).
 */
export function buildEEATMetadata(article: BlogArticle): EEATMetadata {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const supplied = readArticleCredentials(article)

  return {
    author: {
      name: article.authorName,
      url: supplied.url ?? siteUrl,
      jobTitle: supplied.jobTitle ?? DEFAULT_AUTHOR_CREDENTIALS.jobTitle,
      knowsAbout: supplied.knowsAbout ?? DEFAULT_AUTHOR_CREDENTIALS.knowsAbout,
      sameAs: supplied.sameAs ?? DEFAULT_AUTHOR_CREDENTIALS.sameAs,
      description: supplied.description ?? DEFAULT_AUTHOR_CREDENTIALS.description,
    },
    reviewedAt: article.approvedAt?.toISOString(),
    contentType: 'original',
  }
}

/**
 * Enriquece BlogPosting schema com dados E-E-A-T.
 * Adiciona jobTitle, knowsAbout, sameAs, description ao campo author.
 */
export function enrichBlogPostingWithEEAT(
  blogPostingSchema: Record<string, unknown>,
  article: BlogArticle,
): Record<string, unknown> {
  const eeeat = buildEEATMetadata(article)

  return {
    ...blogPostingSchema,
    author: {
      '@type': 'Person',
      name: eeeat.author.name,
      url: eeeat.author.url,
      jobTitle: eeeat.author.jobTitle,
      knowsAbout: eeeat.author.knowsAbout,
      sameAs: eeeat.author.sameAs,
      description: eeeat.author.description,
    },
    ...(eeeat.reviewedAt ? { reviewedAt: eeeat.reviewedAt } : {}),
  }
}
