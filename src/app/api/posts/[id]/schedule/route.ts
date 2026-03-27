/**
 * POST /api/posts/[id]/schedule — Agendar post na fila
 * Requer post aprovado (INT-070). Valida scheduledAt no futuro.
 * module-12-calendar-publishing | POST_050
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, badRequest, internalError } from '@/lib/api-auth'
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { PostService } from '@/lib/services/post.service'
import { schedulePostSchema } from '@/lib/validators/post'
import { ZodError } from 'zod'

interface RouteParams {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const body = await request.json()
    const data = schedulePostSchema.parse(body)

    const post = await PostService.findById(params.id)
    if (!post) return notFound('Post não encontrado')

    const queue = await PublishingQueueService.schedule(params.id, new Date(data.scheduledAt))
    return ok(queue, 201)
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest(error.issues[0].message)
    }
    if (error instanceof Error) {
      const err = error as Error & { code?: string }
      if (err.code === 'POST_050') {
        return NextResponse.json(
          { success: false, error: { code: 'POST_050', message: err.message } },
          { status: 403 }
        )
      }
      if (err.message.includes('não pode ser no passado')) {
        return NextResponse.json(
          { success: false, error: { field: 'scheduledAt', message: err.message } },
          { status: 400 }
        )
      }
    }
    return internalError()
  }
}
