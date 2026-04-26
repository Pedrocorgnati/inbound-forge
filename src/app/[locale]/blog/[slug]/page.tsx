import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import Link from 'next/link'
import { blogService } from '@/lib/services/blog.service'
import { findBlogPostBySlug } from '@/lib/data/blog.data'
import { BLOG_READING_WPM } from '@/lib/constants/blog'
import { buildArticleSchemas } from '@/lib/seo/json-ld'
import { enrichBlogPostingWithEEAT } from '@/lib/seo/eeeat'
import { buildEntityMapping } from '@/lib/seo/entity-mapping'
import { generateBreadcrumbJsonLd, generateHowToJsonLd } from '@/lib/blog/schema-ld'
import { JsonLdScript } from '@/components/blog/JsonLdScript'
import { BlogHero } from '@/components/blog/BlogHero'
import { verifyPreviewToken } from '@/lib/seo/preview-token'
import { RelatedArticlesCluster } from '@/components/blog/RelatedArticlesCluster'

export const revalidate = 3600 // 1 hora — equivalente a BLOG_REVALIDATE (Next.js 15 requer literal)

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ preview?: string }>
}

// TASK-9 ST003 (CL-237): resolve artigo levando em conta token ?preview=...
// Se token valido e casar com o artigo, retorna mesmo em DRAFT e marca isPreview.
async function resolveArticleForRequest(
  slug: string,
  previewToken: string | undefined,
) {
  if (previewToken) {
    const verified = verifyPreviewToken(previewToken)
    if (verified.ok) {
      const draft = await blogService.findBySlugAdmin(slug)
      if (draft && draft.id === verified.payload.articleId) {
        return { article: draft, isPreview: true as const }
      }
    }
  }
  const article = await findBlogPostBySlug(slug)
  return { article, isPreview: false as const }
}

export async function generateStaticParams() {
  try {
    const slugs = await blogService.listPublishedSlugs()
    return slugs.map(({ slug }) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const { preview } = await searchParams
  const { article, isPreview } = await resolveArticleForRequest(slug, preview)

  if (!article) {
    return { title: 'Artigo não encontrado' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'
  const canonical = article.canonicalUrl ?? `${baseUrl}/${locale}/blog/${slug}`
  const ogImageUrl = `${baseUrl}/api/og/blog/${slug}`
  const title = article.metaTitle ?? article.title
  const description = article.metaDescription ?? article.excerpt

  const alternates: Record<string, string> = {
    'pt-BR': `${baseUrl}/pt-BR/blog/${slug}`,
    'en-US': `${baseUrl}/en-US/blog/${slug}`,
    'it-IT': `${baseUrl}/it-IT/blog/${slug}`,
    'es-ES': `${baseUrl}/es-ES/blog/${slug}`,
  }

  // Override with hreflang config if available
  if (article.hreflang) {
    for (const [loc, url] of Object.entries(article.hreflang)) {
      alternates[loc] = url
    }
  }

  return {
    title: `${title} — ${siteName}`,
    description,
    robots: isPreview ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName,
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      modifiedTime: article.updatedAt
        ? new Date(article.updatedAt).toISOString()
        : undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      tags: article.tags,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical,
      languages: alternates,
    },
    authors: article.authorName ? [{ name: article.authorName }] : undefined,
  }
}

// RESOLVED: G002 — locale dinâmico via params em vez de 'pt-BR' hardcoded
function formatDate(date: Date | string | null | undefined, locale = 'pt-BR'): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function estimateReadingTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / BLOG_READING_WPM))
}

export default async function BlogPostPage({
  params,
  searchParams,
}: BlogPostPageProps) {
  const { locale, slug } = await params
  const { preview } = await searchParams
  const { article, isPreview } = await resolveArticleForRequest(slug, preview)

  if (!article) {
    // Intake-Review TASK-2 (CL-298): verificar se slug antigo tem redirect 301 registrado.
    const redirect = await prisma.blogSlugRedirect
      .findUnique({ where: { oldSlug: slug } })
      .catch(() => null)
    if (redirect) {
      permanentRedirect(`/${locale}/blog/${redirect.newSlug}`)
    }

    // TASK-21 ST001 (CL-287): diferencia DELETED (410 Gone) de 404.
    const status = await blogService.findStatusBySlug(slug).catch(() => null)
    if (status === 'DELETED') {
      return (
        <main
          data-testid="blog-post-gone"
          data-http-status="410"
          className="mx-auto max-w-2xl py-20 text-center"
        >
          <meta name="robots" content="noindex, nofollow" />
          <h1 className="text-3xl font-semibold">Conteúdo removido</h1>
          <p className="mt-4 text-muted-foreground">
            Este artigo foi removido permanentemente e não está mais disponível.
          </p>
          <Link
            href={`/${locale}/blog`}
            className="mt-6 inline-block text-primary hover:underline"
          >
            Voltar ao blog
          </Link>
        </main>
      )
    }
    notFound()
  }

  const readingTime = estimateReadingTime(article.body)

  // Build enriched JSON-LD schemas (BlogPosting + BreadcrumbList + optional FAQ/HowTo)
  const schemas = buildArticleSchemas(article)
  const enrichedBlogPosting = enrichBlogPostingWithEEAT(schemas[0], article)
  const entityMap = buildEntityMapping(article)
  const blogPostingWithEntities = {
    ...enrichedBlogPosting,
    mentions: entityMap.mentions,
  }
  const enrichedSchemas: Array<Record<string, unknown>> = [blogPostingWithEntities, ...schemas.slice(1)]

  // TASK-16 (CL-203): BreadcrumbList canônico Home > Blog > Artigo (localizado)
  // e HowTo explícito quando contentType=HOW_TO + howToSteps presentes.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  enrichedSchemas.push(
    generateBreadcrumbJsonLd([
      { name: 'Home', url: `${baseUrl}/${locale}` },
      { name: 'Blog', url: `${baseUrl}/${locale}/blog` },
      { name: article.title, url: `${baseUrl}/${locale}/blog/${slug}` },
    ]) as unknown as Record<string, unknown>,
  )
  const howTo = generateHowToJsonLd({
    contentType: (article as { contentType?: string | null }).contentType,
    howToSteps: (article as { howToSteps?: unknown }).howToSteps,
    title: article.title,
    excerpt: article.excerpt,
  })
  if (howTo) enrichedSchemas.push(howTo as unknown as Record<string, unknown>)

  // Intake Review TASK-7 ST004 (CL-153) — FAQPage schema opcional.
  // Aceita `faqs` se presente no article (campo a ser populado via editor/gerador).
  const faqs = (article as { faqs?: Array<{ question: string; answer: string }> | null }).faqs
  if (Array.isArray(faqs) && faqs.length > 0) {
    enrichedSchemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    })
  }

  return (
    <main data-testid="blog-post-page">
      {isPreview && (
        <div
          data-testid="blog-preview-banner"
          className="sticky top-0 z-50 w-full bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
          role="status"
        >
          Pre-visualizacao — artigo em {article.status} (nao indexavel)
        </div>
      )}
      <JsonLdScript schemas={enrichedSchemas} />
      <article data-testid="blog-post-article" className="mx-auto max-w-3xl">
        {/* Article header */}
        <header data-testid="blog-post-header" className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {article.authorName && <span>{article.authorName}</span>}
            {article.authorName && article.publishedAt && (
              <span aria-hidden="true">&middot;</span>
            )}
            {article.publishedAt && (
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {formatDate(article.publishedAt, locale)}
              </time>
            )}
            <span aria-hidden="true">&middot;</span>
            <span>{readingTime} min de leitura</span>
          </div>
        </header>

        {/* Hero image — priority LCP (FE-022: RESOLVED) */}
        {article.featuredImageUrl && (
          <BlogHero
            src={article.featuredImageUrl}
            alt={article.coverImageAlt ?? article.title}
          />
        )}

        {/* Excerpt — summary-first pattern */}
        {article.excerpt && (
          <div
            data-testid="blog-post-excerpt"
            className="mb-8 rounded-lg border-l-4 border-primary bg-muted/40 p-4 text-base leading-relaxed text-muted-foreground"
          >
            {article.excerpt}
          </div>
        )}

        {/* Article body */}
        <div
          data-testid="blog-post-body"
          className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary prose-img:rounded-lg"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {article.body}
          </ReactMarkdown>
        </div>

        {/* CTA */}
        {article.ctaType && article.ctaUrl && article.ctaLabel && (
          <div
            data-testid="blog-post-cta"
            className="mt-12 rounded-lg border border-border bg-muted/50 p-6 text-center"
          >
            <Link
              href={article.ctaUrl}
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {article.ctaLabel}
            </Link>
          </div>
        )}

        {/* Tags — links clicáveis para /blog/tags/{tag} (CL-150) */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2" data-testid="article-tags">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/${locale}/blog/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Intake Review TASK-8 ST003 — Cluster relacionado */}
        <RelatedArticlesCluster
          clusterId={(article as { clusterId?: string | null }).clusterId}
          currentArticleId={article.id}
          locale={locale}
        />

        {/* Back link */}
        <div className="mt-8 border-t border-border pt-6">
          <Link
            href={`/${locale}/blog`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Voltar ao blog
          </Link>
        </div>
      </article>
    </main>
  )
}
