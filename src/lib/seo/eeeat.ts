// Module-11: E-E-A-T Metadata Builder
// Rastreabilidade: TASK-3 ST004, INT-102, FEAT-publishing-blog-004
// E-E-A-T = Experience, Expertise, Authoritativeness, Trustworthiness

import type { BlogArticle } from '@/types/blog'

export interface EEATMetadata {
  author: {
    name: string
    url: string
    jobTitle: string
    knowsAbout: string[]
  }
  reviewedAt?: string
  contentType: 'original'
}

/**
 * Constrói metadados E-E-A-T para o artigo.
 * reviewedAt usa approvedAt (aprovação humana = credibilidade de revisão).
 */
export function buildEEATMetadata(article: BlogArticle): EEATMetadata {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  return {
    author: {
      name: article.authorName,
      url: siteUrl,
      jobTitle: 'Especialista em Posicionamento Estratégico',
      knowsAbout: [
        'marketing digital',
        'aquisição de clientes',
        'posicionamento B2B',
        'inbound marketing',
        'growth strategy',
      ],
    },
    reviewedAt: article.approvedAt?.toISOString(),
    contentType: 'original',
  }
}

/**
 * Enriquece BlogPosting schema com dados E-E-A-T.
 * Adiciona jobTitle e knowsAbout ao campo author.
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
    },
    ...(eeeat.reviewedAt ? { reviewedAt: eeeat.reviewedAt } : {}),
  }
}
