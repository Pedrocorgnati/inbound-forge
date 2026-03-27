import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ idOrSlug: string }> }

// POST /api/v1/blog/[id]/revalidate
export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { idOrSlug } = await params

  try {
    const article = await prisma.blogArticle.findUnique({ where: { id: idOrSlug } })
    if (!article) return notFound('Artigo não encontrado')

    revalidatePath(`/blog/${article.slug}`)
    revalidatePath('/blog')

    return ok({ message: 'Revalidação solicitada' })
  } catch {
    return internalError()
  }
}
