import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import Link from 'next/link'
import { blogService } from '@/lib/services/blog.service'
import { BLOG_REVALIDATE, BLOG_READING_WPM } from '@/lib/constants/blog'
import { buildArticleSchemas } from '@/lib/seo/json-ld'
import { enrichBlogPostingWithEEAT } from '@/lib/seo/eeeat'
import { buildEntityMapping } from '@/lib/seo/entity-mapping'
import { JsonLdScript } from '@/components/blog/JsonLdScript'

export const revalidate = BLOG_REVALIDATE

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await blogService.listPublishedSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const article = await blogService.findBySlug(slug)

  if (!article) {
    return { title: 'Artigo nao encontrado' }
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
    robots: 'index, follow',
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

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function estimateReadingTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / BLOG_READING_WPM))
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params
  const article = await blogService.findBySlug(slug)

  if (!article) {
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
  const enrichedSchemas = [blogPostingWithEntities, ...schemas.slice(1)]

  return (
    <main data-testid="blog-post-page">
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
                {formatDate(article.publishedAt)}
              </time>
            )}
            <span aria-hidden="true">&middot;</span>
            <span>{readingTime} min de leitura</span>
          </div>
        </header>

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

        {/* Back link */}
        <div className="mt-12 border-t border-border pt-6">
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
