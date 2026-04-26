// POST /api/blog-articles/[id]/unpublish — despublicar artigo (410 Gone na rota publica).
// Intake-Review TASK-17 ST001 (CL-PB-056) / R3: endpoint exigido pelo BlogArticleUnpublishDialog.

import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, conflict, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const article = await prisma.blogArticle.findUnique({
      where: { id },
      select: { id: true, slug: true, status: true, publishedAt: true },
    })
    if (!article) return notFound('Artigo nao encontrado')

    if (article.status !== 'PUBLISHED') {
      return conflict(`Unpublish permitido apenas para PUBLISHED (atual: ${article.status})`)
    }

    const updated = await prisma.blogArticle.update({
      where: { id },
      data: { status: 'ARCHIVED', publishedAt: null },
      select: { id: true, slug: true, status: true },
    })

    // Revalidacao do sitemap + slug publico — respondera 410 no proximo hit.
    try {
      revalidatePath('/sitemap.xml')
      revalidatePath(`/blog/${article.slug}`)
    } catch {
      // revalidatePath falha silenciosamente em runtime edge; nao bloquear
    }

    void auditLog({
      action: 'blog.unpublish',
      entityType: 'BlogArticle',
      entityId: id,
      userId: user.id,
      metadata: { slug: article.slug, previousStatus: article.status },
    })

    return ok({ id: updated.id, slug: updated.slug, status: updated.status })
  } catch {
    return internalError()
  }
}
