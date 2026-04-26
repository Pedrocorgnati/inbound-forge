import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError, validationError } from '@/lib/api-auth'
import { CONTENT_STATUS } from '@/constants/status'

type Params = { params: Promise<{ id: string }> }

const MarkPublishedSchema = z.object({
  publishedUrl: z.string().url().max(1024),
  publishedAt: z.string().datetime().optional(),
})

// POST /api/v1/posts/[id]/publish
export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    if (post.status !== CONTENT_STATUS.APPROVED) {
      return NextResponse.json(
        { success: false, error: 'Post não está aprovado para publicação' },
        { status: 422 }
      )
    }

    // TODO: Implementar via /auto-flow execute
    // BLOG: publicar BlogArticle diretamente via Prisma
    // LINKEDIN/INSTAGRAM: modo assistido
    const updated = await prisma.post.update({
      where: { id },
      data: { status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date() },
    })
    // TASK-7 ST003 (CL-TH-003): atualiza Theme.lastPublishedAt no primeiro publish.
    if (updated.themeId) {
      await prisma.theme.update({
        where: { id: updated.themeId },
        data: { lastPublishedAt: new Date() },
      }).catch(() => { /* theme removido — nao bloqueia publish */ })
    }
    return ok(updated)
  } catch {
    return internalError()
  }
}

/**
 * PATCH /api/v1/posts/[id]/publish — modo assistido (Intake-Review TASK-6 / CL-312).
 * Operador publica manualmente (LinkedIn/Instagram) e registra o URL publicado.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = MarkPublishedSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.issues)

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    const updated = await prisma.post.update({
      where: { id },
      data: {
        publishedUrl: parsed.data.publishedUrl,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date(),
        status: CONTENT_STATUS.PUBLISHED,
      },
    })
    // TASK-7 ST003 (CL-TH-003): Theme.lastPublishedAt reflete modo assistido tambem.
    if (updated.themeId) {
      await prisma.theme.update({
        where: { id: updated.themeId },
        data: { lastPublishedAt: updated.publishedAt ?? new Date() },
      }).catch(() => { /* theme removido — nao bloqueia marcacao */ })
    }
    return ok(updated)
  } catch {
    return internalError()
  }
}
