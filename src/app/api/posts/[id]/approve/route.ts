/**
 * POST /api/posts/[id]/approve — Aprovação humana obrigatória (INT-070)
 * Seta approvedAt + cria audit log (COMP-001)
 * module-12-calendar-publishing
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response

  try {
    const existing = await PostService.findById(id)
    if (!existing) return notFound('Post não encontrado')

    const post = await PostService.approve(id)
    return ok(post)
  } catch {
    return internalError()
  }
}
