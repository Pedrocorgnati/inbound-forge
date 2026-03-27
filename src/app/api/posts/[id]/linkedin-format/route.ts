/**
 * GET /api/posts/[id]/linkedin-format — Retorna texto formatado para LinkedIn
 * NÃO usa LinkedIn API (INT-117). Apenas formata texto para cópia manual.
 * module-12-calendar-publishing | INT-118 | POST_001 | POST_004
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'
import { formatForLinkedIn } from '@/lib/formatters/linkedin-formatter'

interface RouteParams {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const post = await PostService.findById(params.id)
    if (!post) return notFound('Post não encontrado')

    const formatted = formatForLinkedIn(post)
    return ok(formatted)
  } catch {
    return internalError()
  }
}
