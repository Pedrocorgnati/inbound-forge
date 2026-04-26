/**
 * GET /api/v1/images/preview — Preview rapido de arte visual via Satori (sem IA)
 * Rastreabilidade: CL-082, CL-083, TASK-4 ST005
 *
 * Query params:
 *   template     — tipo de template (opcional)
 *   headline     — texto principal (opcional)
 *   backgroundUrl — URL da imagem de fundo (opcional)
 *   width        — largura em px (default 1200)
 *   height       — altura em px (default 630)
 *
 * Retorna imagem PNG como blob ou JSON { imageUrl } para uso como base64.
 * Cache: 5min (CDN) + revalidate a cada request com mesmos params.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { renderTemplate } from '@/lib/image-pipeline'
import { BRAND_COLOR_DEFAULT } from '@/lib/constants/image-worker'
import type { TemplateType } from '@/types/image-template'

const ALLOWED_TEMPLATES = new Set([
  'CAROUSEL', 'STATIC_LANDSCAPE', 'STATIC_PORTRAIT',
  'VIDEO_COVER', 'BEFORE_AFTER', 'ERROR_CARD', 'SOLUTION_CARD', 'BACKSTAGE_CARD',
])

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const sp = request.nextUrl.searchParams
  const templateParam = sp.get('template')?.toUpperCase()
  const headline     = sp.get('headline') ?? ''
  const _width       = Math.min(Math.max(Number(sp.get('width')  ?? 1200), 100), 2000)
  const _height      = Math.min(Math.max(Number(sp.get('height') ?? 630),  100), 2000)

  const templateType: TemplateType = (
    templateParam && ALLOWED_TEMPLATES.has(templateParam)
      ? templateParam
      : 'STATIC_LANDSCAPE'
  ) as TemplateType

  try {
    const svg = await renderTemplate(templateType, {
      headline,
      brandColor: BRAND_COLOR_DEFAULT,
    })

    // Retornar SVG como imagem — browser renderiza nativamente
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type':  'image/svg+xml',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('[preview] Erro ao gerar preview:', err)
    return NextResponse.json(
      { error: { code: 'PREVIEW_001', message: 'Falha ao gerar preview de arte.' } },
      { status: 500 }
    )
  }
}
