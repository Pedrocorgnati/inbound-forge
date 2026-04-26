// Module-11: Blog Articles — POST publicação (requer aprovação prévia)
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-006
// Error Catalog: BLOG_001, BLOG_050, BLOG_051, BLOG_080

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { blogAdminService } from '@/lib/services/blog-admin.service'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  try {
    const article = await blogAdminService.publishArticle(id)
    return ok(article)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'

    // BLOG_050: Publicação sem aprovação prévia
    if (message.includes('BLOG_050')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Artigo precisa ser aprovado antes de ser publicado. Acesse a tela de revisão.',
          code: 'BLOG_050',
        },
        { status: 403 },
      )
    }

    // BLOG_051: Traduções pendentes de revisão humana por locale
    if (message.includes('BLOG_051')) {
      return NextResponse.json(
        {
          success: false,
          error: message,
          code: 'BLOG_051',
        },
        { status: 403 },
      )
    }

    // BLOG_080: Artigo não encontrado
    if (message.includes('P2025') || message.includes('not found')) {
      return notFound('BLOG_080: Artigo não encontrado')
    }

    console.error('[POST /api/blog-articles/[id]/publish]', err)
    return internalError()
  }
}
