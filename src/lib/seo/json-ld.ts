// Module-11: JSON-LD Generators — schema.org structured data
// Rastreabilidade: TASK-3 ST001, INT-096, INT-098, FEAT-publishing-blog-004
// Error Catalog: VAL_001

import type { BlogArticle } from '@/types/blog'
import { BLOG_FAQ_MIN_PAIRS, BLOG_HOWTO_MIN_STEPS } from '@/lib/constants/blog'

export type JsonLd = Record<string, unknown>

const getSiteUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? ''
const getSiteName = () => process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'

// ─── BlogPosting ─────────────────────────────────────────────────────────────

/** Todo artigo recebe BlogPosting. */
export function buildBlogPostingSchema(article: BlogArticle): JsonLd {
  const siteUrl = getSiteUrl()
  const siteName = getSiteName()
  const canonicalUrl = article.canonicalUrl ?? `${siteUrl}/blog/${article.slug}`
  const ogImageUrl = `${siteUrl}/api/og/blog/${article.slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt || article.metaDescription || '',
    image: ogImageUrl,
    author: {
      '@type': 'Person',
      name: article.authorName,
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: { '@type': 'ImageObject', url: `${siteUrl}/images/logo-symbol.svg` },
    },
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    // E-E-A-T: autor enriquecido (INT-102)
    reviewedAt: article.approvedAt?.toISOString(),
  }
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

/**
 * Detecta pares Q&A em formato "**Pergunta?**\nResposta".
 * Retorna FAQPage se ≥ BLOG_FAQ_MIN_PAIRS pares detectados.
 */
export function extractFaqSchema(markdownBody: string): JsonLd | null {
  const regex = /\*\*([^*]+\?)\*\*\s*\n([^\n*]+)/g
  const pairs: Array<{ question: string; answer: string }> = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(markdownBody)) !== null) {
    pairs.push({ question: match[1].trim(), answer: match[2].trim() })
  }

  if (pairs.length < BLOG_FAQ_MIN_PAIRS) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

// ─── HowTo ────────────────────────────────────────────────────────────────────

/**
 * Detecta listas ordenadas "1. Passo..." no Markdown.
 * Retorna HowTo se ≥ BLOG_HOWTO_MIN_STEPS passos detectados.
 */
export function extractHowToSchema(title: string, markdownBody: string): JsonLd | null {
  const regex = /^\d+\.\s+(.+)$/gm
  const steps: string[] = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(markdownBody)) !== null) {
    steps.push(match[1].trim())
  }

  if (steps.length < BLOG_HOWTO_MIN_STEPS) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    step: steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    })),
  }
}

// ─── BreadcrumbList ────────────────────────────────────────────────────────────

/** Todo artigo recebe BreadcrumbList com 3 níveis: Home > Blog > Artigo. */
export function buildBreadcrumbSchema(articleTitle: string, slug: string): JsonLd {
  const siteUrl = getSiteUrl()

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: articleTitle, item: `${siteUrl}/blog/${slug}` },
    ],
  }
}

// ─── Builder Completo ─────────────────────────────────────────────────────────

/**
 * Gera todos os schemas aplicáveis ao artigo.
 * Sempre inclui BlogPosting + BreadcrumbList.
 * Opcionalmente FAQPage e HowTo se detectados no body.
 */
export function buildArticleSchemas(article: BlogArticle): JsonLd[] {
  const schemas: JsonLd[] = [
    buildBlogPostingSchema(article),
    buildBreadcrumbSchema(article.title, article.slug),
  ]

  const faq = extractFaqSchema(article.body)
  if (faq) schemas.push(faq)

  const howTo = extractHowToSchema(article.title, article.body)
  if (howTo) schemas.push(howTo)

  return schemas
}
