/**
 * POST /api/posts/[id]/schedule — Agendar post na fila
 * Requer post aprovado (INT-070). Valida scheduledAt no futuro.
 * module-12-calendar-publishing | POST_050
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'
import { PostService } from '@/lib/services/post.service'
import { schedulePostSchema } from '@/lib/validators/post'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = schedulePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const post = await PostService.findById(id)
    if (!post) return notFound('Post não encontrado')

    const queue = await PublishingQueueService.schedule(id, new Date(parsed.data.scheduledAt))
    return ok(queue, 201)
  } catch (error) {
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
