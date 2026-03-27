// Module-11: Blog Articles — POST aprovação humana obrigatória
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-006
// Error Catalog: BLOG_001, BLOG_080

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, badRequest, internalError } from '@/lib/api-auth'
import { blogAdminService } from '@/lib/services/blog-admin.service'
import { approveArticleSchema } from '@/lib/validators/blog-article'

type Params = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response // BLOG_001

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body inválido')
  }

  const parsed = approveArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  try {
    const article = await blogAdminService.approveArticle(params.id, parsed.data)
    return ok(article)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('Record') && message.includes('not found') || message.includes('P2025')) {
      return notFound('BLOG_080: Artigo não encontrado')
    }
    console.error('[POST /api/blog-articles/[id]/approve]', err)
    return internalError(message)
  }
}
