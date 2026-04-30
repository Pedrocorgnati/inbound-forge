import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError, validationError } from '@/lib/api-auth'
import { CONTENT_STATUS } from '@/constants/status'
import { sendContentPublishedEmail } from '@/lib/notifications/content-published.email'
import { ensureUTMForPost } from '@/lib/services/utm-auto.service'
import { trackServerEvent } from '@/lib/ga4-measurement-protocol'
import { GA4_EVENTS } from '@/constants/ga4-events'

type Params = { params: Promise<{ id: string }> }

const MarkPublishedSchema = z.object({
  publishedUrl: z.string().url().max(1024),
  publishedAt: z.string().datetime().optional(),
})

// POST /api/v1/posts/[id]/publish
export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    // RS-1 auto-UTM: garante trackingUrl antes da publicacao.
    await ensureUTMForPost(id, { userId: user!.id }).catch(() => void 0)

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
    // TASK-9/ST002 F-026: email assíncrono (catch silencioso — não bloqueia response)
    void sendContentPublishedEmail({
      postTitle: updated.caption.slice(0, 80) || `Post ${updated.id}`,
      channel: updated.channel,
      publishedAt: updated.publishedAt ?? new Date(),
      postUrl: updated.trackingUrl ?? undefined,
    }).catch(() => void 0)

    // MS13-B006: GA4 Measurement Protocol server-side. SEC-008: sem PII (apenas channel + theme_id).
    void trackServerEvent({
      name: GA4_EVENTS.CONTENT_PUBLISHED,
      params: {
        channel: updated.channel,
        theme_id: updated.themeId ?? '',
        mode: 'auto',
      },
    }).catch(() => void 0)

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
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  const body = await request.json().catch(() => null)
  const parsed = MarkPublishedSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error.issues)

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return notFound('Post não encontrado')

    // RS-1 auto-UTM: garante trackingUrl antes do registro de publicacao assistida.
    await ensureUTMForPost(id, { userId: user!.id }).catch(() => void 0)

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

    // MS13-B006: GA4 Measurement Protocol — modo assistido. SEC-008: sem PII.
    void trackServerEvent({
      name: GA4_EVENTS.CONTENT_PUBLISHED,
      params: {
        channel: updated.channel,
        theme_id: updated.themeId ?? '',
        mode: 'assisted',
      },
    }).catch(() => void 0)

    return ok(updated)
  } catch {
    return internalError()
  }
}
