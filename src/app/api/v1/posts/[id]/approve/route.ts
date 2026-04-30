import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { CONTENT_STATUS } from '@/constants/status'
import { ensureUTMForPost } from '@/lib/services/utm-auto.service'

type Params = { params: Promise<{ id: string }> }

// POST /api/v1/posts/[id]/approve
export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    const updated = await prisma.post.update({
      where: { id },
      data: { status: CONTENT_STATUS.APPROVED, approvedAt: new Date() },
    })
    // RS-1 auto-UTM: gera trackingUrl automaticamente apos aprovacao.
    // Idempotente — chamadas repetidas nao geram duplicata.
    await ensureUTMForPost(id, { userId: user!.id }).catch(() => void 0)
    return ok(updated)
  } catch {
    return internalError()
  }
}
