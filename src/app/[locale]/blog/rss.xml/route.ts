/**
 * GET /{locale}/blog/rss.xml — RSS 2.0 feed dos ultimos artigos publicados.
 * Intake-Review TASK-4 (CL-303).
 */
import { blogService } from '@/lib/services/blog.service'
import { buildRssXml } from '@/lib/rss-builder'

export const revalidate = 3600 // 1h

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params
  const items = await blogService.listForRss(20)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Inbound Forge'

  const xml = buildRssXml(
    items.map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      metaDescription: item.metaDescription ?? null,
      authorName: item.authorName,
      publishedAt: item.publishedAt ?? null,
      updatedAt: item.updatedAt,
      tags: item.tags ?? [],
    })),
    { locale, baseUrl, siteName },
  )

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
