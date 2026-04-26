/**
 * POST /api/posts/[id]/unschedule — Remove post da fila de publicação
 * module-12-calendar-publishing
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { PostService } from '@/lib/services/post.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  try {
    const post = await PostService.findById(id)
    if (!post) return notFound('Post não encontrado')

    const result = await PublishingQueueService.unschedule(id)
    return ok(result)
  } catch {
    return internalError()
  }
}
