import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

// POST /api/v1/posts/[id]/publish
export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    if (post.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Post não está aprovado para publicação' },
        { status: 422 }
      )
    }

    // TODO: Implementar via /auto-flow execute
    // BLOG: publicar BlogArticle diretamente via Prisma
    // LINKEDIN/INSTAGRAM: modo assistido
    const updated = await prisma.post.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
