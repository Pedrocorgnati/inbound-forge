// TASK-6 ST002 (CL-286): PUT /api/v1/blog/articles/{id}/schedule — agenda ou
// cancela a publicacao de um artigo. Body: { scheduledFor: ISO | null }.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const ScheduleSchema = z.object({
  scheduledFor: z
    .string()
    .datetime()
    .nullable(),
})

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = ScheduleSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const existing = await prisma.blogArticle.findUnique({ where: { id } })
  if (!existing) return notFound('Artigo não encontrado')

  try {
    if (parsed.data.scheduledFor === null) {
      const updated = await prisma.blogArticle.update({
        where: { id },
        data: { status: 'DRAFT', scheduledFor: null },
      })
      if (user?.id) {
        await auditLog({
          action: 'cancel_schedule_article',
          entityType: 'BlogArticle',
          entityId: id,
          userId: user.id,
          metadata: { slug: existing.slug },
        }).catch(() => undefined)
      }
      return ok(updated)
    }

    const when = new Date(parsed.data.scheduledFor)
    if (when.getTime() <= Date.now()) {
      return validationError(new Error('scheduledFor deve ser no futuro'))
    }

    const updated = await prisma.blogArticle.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledFor: when },
    })
    if (user?.id) {
      await auditLog({
        action: 'schedule_article',
        entityType: 'BlogArticle',
        entityId: id,
        userId: user.id,
        metadata: { slug: existing.slug, scheduledFor: when.toISOString() },
      }).catch(() => undefined)
    }
    return ok(updated)
  } catch {
    return internalError()
  }
}
