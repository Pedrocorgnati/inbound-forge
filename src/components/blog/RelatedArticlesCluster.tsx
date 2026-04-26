/**
 * RelatedArticlesCluster — lista artigos do mesmo cluster.
 * Intake Review TASK-8 ST003 (CL-159). Server Component.
 */
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

interface Props {
  clusterId: string | null | undefined
  currentArticleId: string
  locale: string
  limit?: number
}

export async function RelatedArticlesCluster({
  clusterId,
  currentArticleId,
  locale,
  limit = 5,
}: Props) {
  if (!clusterId) return null

  const articles = await prisma.blogArticle
    .findMany({
      where: {
        clusterId,
        status: 'PUBLISHED',
        id: { not: currentArticleId },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, slug: true, title: true, excerpt: true },
    })
    .catch(() => [])

  if (articles.length === 0) return null

  return (
    <section
      data-testid="related-cluster"
      className="mt-10 border-t border-border pt-6"
      aria-label="Artigos do cluster"
    >
      <h2 className="mb-4 text-lg font-semibold">Continue lendo no cluster</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {articles.map((a) => (
          <li key={a.id} className="rounded-lg border border-border bg-card p-4">
            <Link
              href={`/${locale}/blog/${a.slug}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {a.title}
            </Link>
            {a.excerpt && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.excerpt}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RelatedArticlesCluster
