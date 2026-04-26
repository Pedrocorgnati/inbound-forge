/**
 * GET /api/posts — Lista posts com filtros e paginação
 * POST /api/posts — Cria novo post
 * module-12-calendar-publishing | INT-065 | QUAL-005 | SEC-007
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, okPaginated, validationError, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'
import { createPostSchema } from '@/lib/validators/post'

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const channels = searchParams.getAll('channel')
  const statuses = searchParams.getAll('status')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const scheduledFrom = searchParams.get('scheduledFrom') ?? undefined
  const scheduledTo = searchParams.get('scheduledTo') ?? undefined
  const search = searchParams.get('search') ?? undefined

  try {
    const result = await PostService.list({
      channels: channels.length > 0 ? channels : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      page,
      scheduledFrom,
      scheduledTo,
      search,
    })
    return okPaginated(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    })
  } catch {
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const post = await PostService.create(parsed.data)
    return ok(post, 201)
  } catch {
    return internalError()
  }
}
