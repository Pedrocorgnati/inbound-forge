// Module-11: Entity Mapping — GEO optimization
// Rastreabilidade: TASK-3 ST003, INT-103, FEAT-publishing-blog-004

import type { BlogArticle } from '@/types/blog'

export interface EntityMap {
  primaryEntity: string
  relatedEntities: string[]
  authorEntity: {
    name: string
    url: string
    expertise: string[]
  }
  mentions: Array<{ '@type': string; name: string }>
}

const DEFAULT_EXPERTISE = [
  'marketing digital',
  'posicionamento estratégico',
  'inbound marketing',
  'aquisição de clientes B2B',
]

/**
 * Extrai entidades do artigo para otimização GEO (Generative Engine Optimization).
 * Rastreabilidade: INT-103
 */
export function buildEntityMapping(article: BlogArticle): EntityMap {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

  // Entidades via tags (fonte principal)
  const relatedEntities = article.tags ?? []

  // Mentions para JSON-LD (Thing/Person/Organization)
  const mentions = relatedEntities.map((tag) => ({
    '@type': 'Thing',
    name: tag,
  }))

  return {
    primaryEntity: article.title,
    relatedEntities,
    authorEntity: {
      name: article.authorName,
      url: siteUrl,
      expertise: DEFAULT_EXPERTISE,
    },
    mentions,
  }
}
