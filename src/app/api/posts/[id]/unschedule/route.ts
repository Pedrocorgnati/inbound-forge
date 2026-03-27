/**
 * POST /api/posts/[id]/unschedule — Remove post da fila de publicação
 * module-12-calendar-publishing
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { PostService } from '@/lib/services/post.service'

interface RouteParams {
  params: { id: string }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const post = await PostService.findById(params.id)
    if (!post) return notFound('Post não encontrado')

    const result = await PublishingQueueService.unschedule(params.id)
    return ok(result)
  } catch {
    return internalError()
  }
}
