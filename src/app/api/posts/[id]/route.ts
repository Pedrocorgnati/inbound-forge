/**
 * GET /api/posts/[id] — Busca post por ID
 * PUT /api/posts/[id] — Atualiza post
 * DELETE /api/posts/[id] — Remove post
 * module-12-calendar-publishing | INT-065 | SEC-007
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'
import { updatePostSchema } from '@/lib/validators/post'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  const post = await PostService.findById(id)
  if (!post) return notFound('Post não encontrado')

  return ok(post)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = updatePostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const post = await PostService.update(id, parsed.data)
    if (!post) return notFound('Post não encontrado')
    return ok(post)
  } catch (error) {
    if (error instanceof Error && error.message.includes('não podem ser editados')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      )
    }
    return internalError()
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  try {
    const post = await PostService.findById(id)
    if (!post) return notFound('Post não encontrado')

    await PostService.delete(id)
    return ok({ success: true })
  } catch {
    return internalError()
  }
}
