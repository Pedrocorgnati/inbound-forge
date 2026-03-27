// Module-11: Sitemap dinâmico
// Rastreabilidade: NEXT-002, FEAT-publishing-blog-003
// Inclui homepage, /blog e todos os artigos PUBLISHED

import type { MetadataRoute } from 'next'
import { blogService } from '@/lib/services/blog.service'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (!siteUrl) {
    // VAL_001: NEXT_PUBLIC_BASE_URL ausente — retornar sitemap mínimo (não gerar URL com "undefined")
    console.error('[VAL_001] NEXT_PUBLIC_BASE_URL não configurado — sitemap retornando apenas homepage')
    return [{ url: 'https://inbound-forge.vercel.app', lastModified: new Date() }]
  }

  // SYS_001: Se banco indisponível, retornar sitemap mínimo sem crash
  let blogEntries: MetadataRoute.Sitemap = []
  try {
    const slugs = await blogService.listPublishedSlugs()
    blogEntries = slugs.map((article) => ({
      url: `${siteUrl}/blog/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (err) {
    console.error('[SYS_001] Banco indisponível ao gerar sitemap — retornando sitemap mínimo:', err)
  }

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...blogEntries,
  ]
}
