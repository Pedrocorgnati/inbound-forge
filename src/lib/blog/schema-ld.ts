// TASK-7 ST001 (CL-200): builder de JSON-LD Article com authorCredentials.
// E-E-A-T compliance: jobTitle, knowsAbout, sameAs, description. Usa defaults
// da plataforma quando `article.authorCredentials` e null/undefined.

import type { BlogArticle } from '@/types/blog'

export interface AuthorCredentials {
  jobTitle?: string
  description?: string
  knowsAbout?: string[]
  sameAs?: string[]
  url?: string
}

export const DEFAULT_AUTHOR_CREDENTIALS: Required<Pick<AuthorCredentials, 'jobTitle' | 'description' | 'knowsAbout' | 'sameAs'>> = {
  jobTitle: 'Especialista em Posicionamento Estratégico',
  description: 'Consultor e fundador da Inbound Forge, especializado em aquisição de clientes B2B orientada a nicho.',
  knowsAbout: [
    'marketing digital',
    'aquisição de clientes',
    'posicionamento B2B',
    'inbound marketing',
    'growth strategy',
  ],
  sameAs: [
    'https://www.linkedin.com/in/pedrocorgnati',
    'https://github.com/pedrocorgnati',
  ],
}

function readCredentials(raw: unknown): AuthorCredentials {
  if (!raw || typeof raw !== 'object') return {}
  const record = raw as Record<string, unknown>
  const out: AuthorCredentials = {}
  if (typeof record.jobTitle === 'string') out.jobTitle = record.jobTitle
  if (typeof record.description === 'string') out.description = record.description
  if (typeof record.url === 'string') out.url = record.url
  if (Array.isArray(record.knowsAbout)) {
    out.knowsAbout = record.knowsAbout.filter((x): x is string => typeof x === 'string')
  }
  if (Array.isArray(record.sameAs)) {
    out.sameAs = record.sameAs.filter((x): x is string => typeof x === 'string')
  }
  return out
}

export interface ArticleJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Article'
  headline: string
  description?: string
  datePublished?: string
  dateModified?: string
  mainEntityOfPage?: { '@type': 'WebPage'; '@id': string }
  publisher: { '@type': 'Organization'; name: string; url?: string }
  author: {
    '@type': 'Person'
    name: string
    jobTitle: string
    knowsAbout: string[]
    sameAs: string[]
    description: string
    url?: string
  }
  image?: string | string[]
  keywords?: string[]
}

export interface GenerateArticleJsonLdInput {
  article: Pick<
    BlogArticle,
    'title' | 'excerpt' | 'publishedAt' | 'updatedAt' | 'authorName' | 'featuredImageUrl' | 'tags' | 'canonicalUrl' | 'slug'
  > & {
    authorCredentials?: unknown
  }
  locale?: string
  siteUrl?: string
  siteName?: string
}

// TASK-16 ST001 (CL-203): builders auxiliares — BreadcrumbList + HowTo.

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface BreadcrumbJsonLd {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }>
}

export function generateBreadcrumbJsonLd(crumbs: BreadcrumbItem[]): BreadcrumbJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

export interface HowToStepInput {
  name?: string
  text: string
  url?: string
  image?: string
}

export interface HowToJsonLd {
  '@context': 'https://schema.org'
  '@type': 'HowTo'
  name: string
  description?: string
  step: Array<{
    '@type': 'HowToStep'
    position: number
    name?: string
    text: string
    url?: string
    image?: string
  }>
}

export function readHowToSteps(raw: unknown): HowToStepInput[] | null {
  if (!Array.isArray(raw)) return null
  const out: HowToStepInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const text = typeof rec.text === 'string' ? rec.text : undefined
    if (!text) continue
    out.push({
      text,
      name: typeof rec.name === 'string' ? rec.name : undefined,
      url: typeof rec.url === 'string' ? rec.url : undefined,
      image: typeof rec.image === 'string' ? rec.image : undefined,
    })
  }
  return out.length ? out : null
}

export interface GenerateHowToInput {
  contentType?: string | null
  howToSteps?: unknown
  title: string
  excerpt?: string | null
}

export function generateHowToJsonLd(input: GenerateHowToInput): HowToJsonLd | null {
  if (input.contentType !== 'HOW_TO') return null
  const steps = readHowToSteps(input.howToSteps)
  if (!steps) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.title,
    description: input.excerpt ?? undefined,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      url: s.url,
      image: s.image,
    })),
  }
}

export function generateArticleJsonLd({ article, locale = 'pt-BR', siteUrl, siteName }: GenerateArticleJsonLdInput): ArticleJsonLd {
  const base = siteUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const brand = siteName ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'
  const canonical = article.canonicalUrl ?? `${base}/${locale}/blog/${article.slug}`

  const supplied = readCredentials(article.authorCredentials)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    publisher: { '@type': 'Organization', name: brand, url: base || undefined },
    author: {
      '@type': 'Person',
      name: article.authorName,
      jobTitle: supplied.jobTitle ?? DEFAULT_AUTHOR_CREDENTIALS.jobTitle,
      knowsAbout: supplied.knowsAbout ?? DEFAULT_AUTHOR_CREDENTIALS.knowsAbout,
      sameAs: supplied.sameAs ?? DEFAULT_AUTHOR_CREDENTIALS.sameAs,
      description: supplied.description ?? DEFAULT_AUTHOR_CREDENTIALS.description,
      url: (supplied.url ?? base) || undefined,
    },
    image: article.featuredImageUrl ?? undefined,
    keywords: article.tags,
  }
}
