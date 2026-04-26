/**
 * MDX Exporter — Inbound Forge
 * TASK-8 ST001 / CL-118 (pos-MVP)
 *
 * Converte BlogArticle para MDX com frontmatter compativel com sites Next.js externos.
 * Imagens referenciadas como URLs absolutas (CDN Supabase).
 */

export interface ArticleForExport {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  featuredImageUrl: string | null
  tags: string[]
  authorName: string
  canonicalUrl: string | null
  publishedAt: Date | null
}

export function exportArticleAsMdx(article: ArticleForExport, locale = 'pt-BR'): string {
  const date = article.publishedAt
    ? article.publishedAt.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const canonical = article.canonicalUrl ?? `https://inbound-forge.com/${locale}/blog/${article.slug}`

  const frontmatter = [
    '---',
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `description: "${article.excerpt.replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    `tags: [${article.tags.map((t) => `"${t}"`).join(', ')}]`,
    `cover: "${article.featuredImageUrl ?? ''}"`,
    `author: "${article.authorName}"`,
    `locale: "${locale}"`,
    `canonical: "${canonical}"`,
    '---',
  ].join('\n')

  // Body: HTML simples -> MDX (conversao basica, sem dependencia externa)
  const body = htmlToMdxSimple(article.body)

  return `${frontmatter}\n\n${body}\n`
}

function htmlToMdxSimple(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `${c.trim()}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${c.trim()}\n`)
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
