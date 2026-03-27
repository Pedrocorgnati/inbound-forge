import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'

type Params = { params: Promise<{ id: string }> }

// POST /api/v1/posts/[id]/approve
export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    const updated = await prisma.post.update({
      where: { id },
      data: { status: 'APPROVED' },
    })
    return ok(updated)
  } catch {
    return internalError()
  }
}
