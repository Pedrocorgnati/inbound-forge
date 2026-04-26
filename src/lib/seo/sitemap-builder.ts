import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/types'

const STATIC_ROUTES = [
  { path: '', priority: 1, changeFrequency: 'daily' as const },
  { path: '/blog', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' as const },
  // TASK-5 CL-245
  { path: '/terms', priority: 0.3, changeFrequency: 'monthly' as const },
]

function buildAlternates(siteUrl: string, path: string): Record<string, string> {
  const alternates: Record<string, string> = {}
  for (const locale of SUPPORTED_LOCALES) {
    alternates[locale] = `${siteUrl}/${locale}${path}`
  }
  alternates['x-default'] = `${siteUrl}/${DEFAULT_LOCALE}${path}`
  return alternates
}

export async function buildSitemap(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}/${DEFAULT_LOCALE}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: buildAlternates(siteUrl, route.path) },
  }))

  let articles: Array<{ slug: string; updatedAt: Date; translations: Array<{ locale: string; slug: string }> }> = []
  try {
    const rows = await prisma.blogArticle.findMany({
      where: { status: 'PUBLISHED' as never },
      select: { slug: true, updatedAt: true },
    })
    const translations = await (prisma as unknown as {
      blogArticleTranslation: {
        findMany: (args: unknown) => Promise<Array<{ articleId: string; locale: string; slug: string }>>
      }
    }).blogArticleTranslation.findMany({
      where: { status: 'APPROVED' },
      select: { articleId: true, locale: true, slug: true },
    }).catch(() => [])

    const byArticle = new Map<string, Array<{ locale: string; slug: string }>>()
    for (const t of translations) {
      const list = byArticle.get(t.articleId) || []
      list.push({ locale: t.locale, slug: t.slug })
      byArticle.set(t.articleId, list)
    }

    articles = rows.map((r) => ({
      slug: r.slug,
      updatedAt: r.updatedAt,
      translations: byArticle.get((r as unknown as { id: string }).id) || [],
    }))
  } catch (err) {
    console.error('[sitemap] db unavailable', err)
  }

  const blogEntries: MetadataRoute.Sitemap = articles.map((article) => {
    const languages: Record<string, string> = {}
    for (const locale of SUPPORTED_LOCALES) {
      const t = article.translations.find((tr) => tr.locale === locale)
      const slug = t?.slug || article.slug
      languages[locale] = `${siteUrl}/${locale}/blog/${slug}`
    }
    languages['x-default'] = `${siteUrl}/${DEFAULT_LOCALE}/blog/${article.slug}`
    return {
      url: `${siteUrl}/${DEFAULT_LOCALE}/blog/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages },
    }
  })

  return [...staticEntries, ...blogEntries]
}
