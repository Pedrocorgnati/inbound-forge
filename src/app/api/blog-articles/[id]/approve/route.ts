// Module-11: Blog Articles — POST aprovação humana obrigatória
// Rastreabilidade: TASK-2 ST001, FEAT-publishing-blog-006
// Error Catalog: BLOG_001, BLOG_080

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, notFound, badRequest, internalError } from '@/lib/api-auth'
import { blogAdminService } from '@/lib/services/blog-admin.service'
import { approveArticleSchema } from '@/lib/validators/blog-article'
import { prisma } from '@/lib/prisma'
import { validateSummaryFirst } from '@/lib/blog/summary-first-validator'
// TASK-5 ST002: auto-publish após aprovação (CL-053)
// Intake Review TASK-5 ST005 (CL-164): gate summary-first antes de aprovar.

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
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
    // Intake Review TASK-5 ST005: gate summary-first antes de aprovar.
    const article = await prisma.blogArticle.findUnique({
      where: { id },
      select: { body: true, tags: true, title: true },
    })
    if (article?.body) {
      const kwList: string[] = []
      if (Array.isArray(article.tags)) {
        for (const k of article.tags) {
          if (typeof k === 'string') kwList.push(k)
        }
      }
      const check = validateSummaryFirst({ content: article.body, keywords: kwList })
      if (!check.valid) {
        return NextResponse.json(
          {
            success: false,
            code: 'BLOG_SUMMARY_FIRST',
            message: `Artigo reprovado em summary-first: ${check.reason}`,
            details: {
              missingKeywords: check.missingKeywords,
              coverageRatio: check.coverageRatio,
              wordCount: check.wordCount,
            },
          },
          { status: 422 },
        )
      }
    }

    // Aprovar artigo
    await blogAdminService.approveArticle(id, parsed.data)

    // TASK-5 ST002: auto-publish imediatamente após aprovação (CL-053)
    const publishedArticle = await blogAdminService.publishArticle(id)

    return ok({ ...publishedArticle, autoPublished: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (message.includes('Record') && message.includes('not found') || message.includes('P2025')) {
      return notFound('BLOG_080: Artigo não encontrado')
    }
    console.error('[POST /api/blog-articles/[id]/approve]', err)
    return internalError(message)
  }
}
