// Module-11: OG Image dinâmica — Satori edge runtime
// Rastreabilidade: TASK-3 ST002, INT-096, FEAT-publishing-blog-003
// Error Catalog: BLOG_080, SYS_001

import { ImageResponse } from 'next/og'
import { blogService } from '@/lib/services/blog.service'
import { BLOG_OG_IMAGE_CACHE_SECONDS } from '@/lib/constants/blog'

export const runtime = 'edge'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const article = await blogService.findBySlug(slug)

  // BLOG_080: Artigo não encontrado ou não publicado
  if (!article) {
    return new Response('Not found', { status: 404 })
  }

  // RESOLVED: G002 — locale dinâmico via query param em vez de 'pt-BR' hardcoded
  const locale = new URL(req.url).searchParams.get('locale') ?? 'pt-BR'

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  try {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 1200,
            height: 630,
            background: '#0F172A',
            padding: '60px',
          }}
        >
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#3B82F6',
                letterSpacing: '-0.5px',
              }}
            >
              Inbound Forge
            </span>
          </div>

          {/* Título */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              padding: '40px 0',
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: '#F8FAFC',
                lineHeight: 1.2,
                letterSpacing: '-1px',
              }}
            >
              {article.title}
            </span>
          </div>

          {/* Autor + Data */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 24, color: '#94A3B8', fontWeight: 500 }}>
              {article.authorName}
            </span>
            {publishedDate && (
              <span style={{ fontSize: 20, color: '#64748B' }}>{publishedDate}</span>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': `public, max-age=${BLOG_OG_IMAGE_CACHE_SECONDS}, s-maxage=${BLOG_OG_IMAGE_CACHE_SECONDS}, stale-while-revalidate=3600`,
        },
      },
    )
  } catch (err) {
    // SYS_001: Fallback — imagem placeholder se Satori falhar
    console.error('[SYS_001] OG image generation failed:', err)
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 1200,
            height: 630,
            background: '#0F172A',
          }}
        >
          <span style={{ fontSize: 32, color: '#F8FAFC' }}>Inbound Forge</span>
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }
}
