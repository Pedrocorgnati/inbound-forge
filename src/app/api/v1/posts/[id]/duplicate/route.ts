// POST /api/v1/posts/[id]/duplicate — TASK-14 ST002 / CL-233 + Intake-Review TASK-1 ST003 (CL-226)
// Aceita `targetChannel` opcional no body; quando diferente do canal origem, adapta conteudo via adaptForChannel.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, notFound, internalError, validationError, badRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'
import { adaptForChannel, type AdaptChannel } from '@/lib/publishing/adaptForChannel'
import { writePublishAudit } from '@/lib/publishing/auditLog'

type Params = { params: Promise<{ id: string }> }

const DuplicateBodySchema = z.object({
  targetChannel: z.enum(['INSTAGRAM', 'LINKEDIN', 'BLOG']).optional(),
})

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown = {}
  try { body = await request.json() } catch { /* body vazio aceitavel */ }

  const parsed = DuplicateBodySchema.safeParse(body ?? {})
  if (!parsed.success) return validationError(parsed.error)

  try {
    const original = await prisma.post.findUnique({ where: { id } })
    if (!original) return notFound('Post nao encontrado')

    const sourceChannel = original.channel as AdaptChannel
    const targetChannel = (parsed.data.targetChannel ?? sourceChannel) as AdaptChannel

    if (parsed.data.targetChannel && parsed.data.targetChannel === sourceChannel) {
      return badRequest('targetChannel deve ser diferente do canal de origem')
    }

    const adapted = adaptForChannel(
      {
        caption: original.caption,
        hashtags: original.hashtags,
        ctaText: original.ctaText,
        ctaUrl: original.ctaUrl,
        sourceChannel,
      },
      targetChannel,
    )

    const copy = await prisma.post.create({
      data: {
        channel: targetChannel,
        caption: adapted.caption,
        hashtags: adapted.hashtags,
        cta: original.cta,
        ctaText: adapted.ctaText,
        ctaUrl: adapted.ctaUrl,
        imageUrl: original.imageUrl,
        videoUrl: original.videoUrl,
        status: 'DRAFT',
        scheduledAt: null,
        publishedAt: null,
        platform: targetChannel === sourceChannel ? original.platform : null,
        sourcePostId: original.id,
        themeId: original.themeId,
      },
    })

    await auditLog({
      action: 'POST_DUPLICATED',
      entityType: 'Post',
      entityId: copy.id,
      userId: user!.id,
      metadata: { originalId: original.id, targetChannel },
    }).catch(() => undefined)

    await writePublishAudit({
      postId: copy.id,
      operatorId: user!.id,
      action: 'duplicate',
      delta: {
        sourcePostId: original.id,
        sourceChannel,
        targetChannel,
      },
    })

    return NextResponse.json({ success: true, post: copy }, { status: 201 })
  } catch {
    return internalError()
  }
}
