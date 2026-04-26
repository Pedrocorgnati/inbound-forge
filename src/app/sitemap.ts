// Quad-market sitemap dinamico (CL-176)
// Inclui rotas estaticas + artigos blog com hreflang para pt-BR/en-US/it-IT/es-ES

import type { MetadataRoute } from 'next'
import { buildSitemap } from '@/lib/seo/sitemap-builder'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (!siteUrl) {
    console.error('[sitemap] NEXT_PUBLIC_BASE_URL ausente — sitemap minimo')
    return [{ url: 'https://inbound-forge.vercel.app', lastModified: new Date() }]
  }

  return buildSitemap(siteUrl)
}
