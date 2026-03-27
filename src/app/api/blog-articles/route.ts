// Module-11: Blog Articles API — GET list + POST create
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-001
// Error Catalog: BLOG_001, BLOG_020, VAL_001

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, okPaginated, badRequest, conflict, internalError } from '@/lib/api-auth'
import { blogAdminService } from '@/lib/services/blog-admin.service'
import { createArticleSchema, listArticlesSchema } from '@/lib/validators/blog-article'
import { generateSlug } from '@/lib/utils/slug'

// ─── GET /api/blog-articles ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response // BLOG_001: 401

  const searchParams = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = listArticlesSchema.safeParse(searchParams)
  if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors.toString())

  const result = await blogAdminService.listArticles(parsed.data)

  return okPaginated(result.items, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  })
}

// ─── POST /api/blog-articles ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { response } = await requireSession()
  if (response) return response // BLOG_001: 401

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body inválido')
  }

  // Auto-gerar slug se não fornecido
  if (typeof body === 'object' && body !== null && !('slug' in body)) {
    const title = (body as Record<string, unknown>).title
    if (typeof title === 'string') {
      ;(body as Record<string, unknown>).slug = generateSlug(title)
    }
  }

  const parsed = createArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors }, // VAL_001
      { status: 400 },
    )
  }

  try {
    const article = await blogAdminService.createArticle(parsed.data)
    return ok(article, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    // BLOG_020: Slug duplicado (Prisma unique constraint)
    if (message.includes('Unique constraint') || message.includes('P2002')) {
      return conflict(
        `BLOG_020: Slug "${parsed.data.slug}" já existe. Tente: ${parsed.data.slug}-${Date.now()}`,
      )
    }
    console.error('[POST /api/blog-articles]', err)
    return internalError()
  }
}
