// Module-11: robots.txt dinâmico
// Rastreabilidade: NEXT-002
// Bloqueia rotas privadas; permite /blog, /privacy e raiz

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://inbound-forge.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/(dashboard)/',
        '/[locale]/(protected)/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
