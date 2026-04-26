/**
 * MDX Export Service — Serializa BlogArticle para MDX com frontmatter
 * Rastreabilidade: CL-137, TASK-8 ST003
 */

export interface BlogArticleExport {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  tags: string[]
  authorName: string
  publishedAt: Date | null
  createdAt: Date
  featuredImageUrl?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
}

export interface MDXExportOptions {
  /** Locale para o arquivo exportado (ex: "pt-BR", "en") */
  locale?: string
  /** Incluir comentários TODO para componentes MDX customizados */
  includeComponentTodos?: boolean
}

/**
 * Serializa um BlogArticle para string MDX com frontmatter YAML.
 *
 * @example
 * ```ts
 * const mdx = exportToMDX(article)
 * await fs.writeFile(`content/blog/${article.slug}.mdx`, mdx)
 * ```
 *
 * @remarks
 * TODO (pós-MVP): Substituir tags `<Image>`, `<Callout>`, `<CodeBlock>` no
 * corpo markdown por componentes MDX customizados importados do design system.
 * Ver ai-forge/blueprints para referência de componentes disponíveis.
 */
export function exportToMDX(
  article: BlogArticleExport,
  options: MDXExportOptions = {}
): string {
  const { locale = 'pt-BR', includeComponentTodos = true } = options

  const publishedAt = article.publishedAt
    ? article.publishedAt.toISOString().split('T')[0]
    : article.createdAt.toISOString().split('T')[0]

  const tags = article.tags.length > 0
    ? `\n  - ${article.tags.join('\n  - ')}`
    : ' []'

  const frontmatter = [
    '---',
    `title: "${escapeFrontmatterString(article.title)}"`,
    `slug: "${article.slug}"`,
    `date: "${publishedAt}"`,
    `author: "${escapeFrontmatterString(article.authorName)}"`,
    `excerpt: "${escapeFrontmatterString(article.excerpt)}"`,
    `locale: "${locale}"`,
    `tags:${tags}`,
    article.featuredImageUrl ? `featuredImage: "${article.featuredImageUrl}"` : null,
    article.metaTitle ? `metaTitle: "${escapeFrontmatterString(article.metaTitle)}"` : null,
    article.metaDescription ? `metaDescription: "${escapeFrontmatterString(article.metaDescription)}"` : null,
    article.canonicalUrl ? `canonical: "${article.canonicalUrl}"` : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n')

  const componentTodos = includeComponentTodos
    ? [
        '',
        '{/* TODO (pós-MVP): Importar componentes MDX customizados do design system:',
        '     import { Callout } from "@/components/mdx/Callout"',
        '     import { CodeBlock } from "@/components/mdx/CodeBlock"',
        '     import { AuthorBio } from "@/components/mdx/AuthorBio"',
        '     import { CTABanner } from "@/components/mdx/CTABanner"',
        '     Ver ai-forge/component-kit/INDEX.md para componentes disponíveis. */',
        '',
      ].join('\n')
    : ''

  const body = normalizeMarkdownBody(article.body)

  return `${frontmatter}${componentTodos}\n${body}\n`
}

/**
 * Exporta múltiplos artigos para um mapa slug → conteúdo MDX.
 */
export function exportBatchToMDX(
  articles: BlogArticleExport[],
  options: MDXExportOptions = {}
): Map<string, string> {
  const result = new Map<string, string>()
  for (const article of articles) {
    result.set(article.slug, exportToMDX(article, options))
  }
  return result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeFrontmatterString(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\n/g, ' ')
}

/**
 * Normaliza o corpo markdown:
 * - Garante exatamente uma linha em branco entre seções
 * - Remove espaços em branco no final de linhas
 */
function normalizeMarkdownBody(body: string): string {
  return body
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
