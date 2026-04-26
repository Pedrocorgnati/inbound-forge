/**
 * PATCH /api/v1/blog-articles/translations/[id] — Intake Review TASK-13 ST003.
 * Atualiza status da traducao. Cada transicao gera BlogArticleVersion de audit.
 *
 * Ressalva: enum atual suporta DRAFT/APPROVED/REJECTED. IN_REVIEW/PUBLISHED
 * requerem extensao de schema.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const BodySchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await ctx.params
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return validationError(new Error('JSON invalido'))
  }

  const parsed = BodySchema.safeParse(payload)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.blogArticleTranslation.findUnique({ where: { id } })
    if (!existing) return notFound('Traducao nao encontrada')

    const updated = await prisma.blogArticleTranslation.update({
      where: { id },
      data: {
        status: parsed.data.status,
        rejectionReason: parsed.data.rejectionReason ?? null,
        approvedAt: parsed.data.status === 'APPROVED' ? new Date() : null,
      },
    })

    // Audit trail best-effort (BlogArticleVersion).
    await prisma.blogArticleVersion.create({
      data: {
        articleId: existing.articleId,
        version: 0,
        title: existing.title,
        contentMd: existing.contentMd,
        changeNote: `translation:${existing.locale} -> ${parsed.data.status}${user?.email ? ` by ${user.email}` : ''}`,
      } as never,
    }).catch(() => undefined)

    return ok(updated)
  } catch (err) {
    console.error('[PATCH /api/v1/blog-articles/translations/[id]]', err)
    return internalError()
  }
}
