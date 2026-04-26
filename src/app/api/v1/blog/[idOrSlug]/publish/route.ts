import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { BLOG_STATUS } from '@/constants/status'

type Params = { params: Promise<{ idOrSlug: string }> }

// POST /api/v1/blog/[id]/publish
export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { idOrSlug } = await params

  try {
    const article = await prisma.blogArticle.findUnique({ where: { id: idOrSlug } })
    if (!article) return notFound('Artigo não encontrado')

    const updated = await prisma.blogArticle.update({
      where: { id: idOrSlug },
      data: { status: BLOG_STATUS.PUBLISHED, publishedAt: new Date() },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
