/**
 * GET /api/posts — Lista posts com filtros e paginação
 * POST /api/posts — Cria novo post
 * module-12-calendar-publishing | INT-065 | QUAL-005 | SEC-007
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, okPaginated, badRequest, internalError } from '@/lib/api-auth'
import { PostService } from '@/lib/services/post.service'
import { createPostSchema } from '@/lib/validators/post'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  try {
    const result = await PostService.list({ channel, status, page })
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

  try {
    const body = await request.json()
    const data = createPostSchema.parse(body)
    const post = await PostService.create(data)
    return ok(post, 201)
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues[0]
      try {
        const parsed = JSON.parse(issue.message)
        return NextResponse.json({ success: false, error: parsed }, { status: 400 })
      } catch {
        return badRequest(issue.message)
      }
    }
    return internalError()
  }
}
