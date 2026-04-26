/**
 * Intake-Review TASK-4 (CL-303): helper que gera RSS 2.0 a partir de artigos
 * publicados. Escapa XML e formata datas em RFC 822.
 */

export type RssItem = {
  slug: string
  title: string
  excerpt: string
  metaDescription: string | null
  authorName: string
  publishedAt: Date | null
  updatedAt: Date
  tags: string[]
}

export interface BuildRssOptions {
  locale: string
  baseUrl: string
  siteName: string
  siteDescription?: string
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function toRfc822(date: Date | null | undefined): string {
  const d = date ?? new Date()
  return d.toUTCString()
}

export function buildRssXml(items: RssItem[], options: BuildRssOptions): string {
  const { locale, baseUrl, siteName, siteDescription } = options
  const channelLink = `${baseUrl}/${locale}/blog`
  const channelSelf = `${baseUrl}/${locale}/blog/rss.xml`
  const desc = siteDescription ?? `Ultimos artigos de ${siteName}`

  const lastBuildDate = toRfc822(items[0]?.publishedAt ?? items[0]?.updatedAt)

  const itemsXml = items
    .map((item) => {
      const link = `${baseUrl}/${locale}/blog/${item.slug}`
      const description = item.metaDescription ?? item.excerpt
      const pubDate = toRfc822(item.publishedAt ?? item.updatedAt)
      const categories = item.tags
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join('\n')
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(description)}</description>
      <author>${escapeXml(item.authorName)}</author>
      <pubDate>${pubDate}</pubDate>
${categories}
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} — Blog</title>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(channelSelf)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(desc)}</description>
    <language>${escapeXml(locale)}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`
}
