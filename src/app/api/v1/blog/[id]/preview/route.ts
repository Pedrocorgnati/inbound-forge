// POST /api/v1/blog/[id]/preview — emite token temporario para preview (TASK-9 ST002 / CL-237)

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, notFound, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { mintPreviewToken } from '@/lib/seo/preview-token'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const article = await prisma.blogArticle.findUnique({
      where: { id },
      select: { id: true, slug: true },
    })
    if (!article) return notFound('Artigo nao encontrado')

    const token = mintPreviewToken(article.id)
    const origin = new URL(request.url).origin
    const locale = 'pt-BR'
    const url = `${origin}/${locale}/blog/${article.slug}?preview=${encodeURIComponent(token)}`

    await auditLog({
      action: 'BLOG_PREVIEW_MINTED',
      entityType: 'BlogArticle',
      entityId: article.id,
      userId: user!.id,
      metadata: { slug: article.slug, locale },
    })

    return NextResponse.json({
      success: true,
      token,
      url,
      expiresInSec: 15 * 60,
    })
  } catch {
    return internalError()
  }
}
