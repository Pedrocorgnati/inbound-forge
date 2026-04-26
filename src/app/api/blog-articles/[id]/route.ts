// Module-11: Blog Articles API — GET + PUT + DELETE por ID
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-001
// Error Catalog: BLOG_001, BLOG_020, BLOG_080, VAL_001, VAL_020

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, badRequest, conflict, internalError } from '@/lib/api-auth'
import { blogAdminService } from '@/lib/services/blog-admin.service'
import { updateArticleSchema } from '@/lib/validators/blog-article'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/blog-articles/[id] ────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  const article = await blogAdminService.getArticle(id)
  if (!article) return notFound('BLOG_080: Artigo não encontrado') // BLOG_080

  return ok(article)
}

// ─── PUT /api/blog-articles/[id] ────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body inválido')
  }

  const parsed = updateArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors }, // VAL_001, VAL_020
      { status: 400 },
    )
  }

  try {
    const article = await blogAdminService.updateArticle(id, parsed.data)
    return ok(article)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('Record to update not found') || message.includes('P2025')) {
      return notFound('BLOG_080: Artigo não encontrado') // BLOG_080
    }
    if (message.includes('Unique constraint') || message.includes('P2002')) {
      return conflict('BLOG_020: Slug já existe') // BLOG_020
    }
    console.error('[PUT /api/blog-articles/[id]]', err)
    return internalError()
  }
}

// ─── DELETE /api/blog-articles/[id] ─────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  try {
    await blogAdminService.deleteArticle(id)
    return ok({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('Record to delete does not exist') || message.includes('P2025')) {
      return notFound('BLOG_080: Artigo não encontrado') // BLOG_080
    }
    console.error('[DELETE /api/blog-articles/[id]]', err)
    return internalError()
  }
}
