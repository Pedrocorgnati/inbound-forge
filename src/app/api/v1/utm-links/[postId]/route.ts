/**
 * GET    /api/v1/utm-links/[postId] — Buscar UTMLink por postId
 * DELETE /api/v1/utm-links/[postId] — Remover UTMLink + limpar Post.trackingUrl
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError, validationError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ postId: string }> }

// TASK-17 ST002 (CL-263): edicao de campos UTM.
const UpdateUtmSchema = z.object({
  source: z.string().min(1).max(80).optional(),
  medium: z.string().min(1).max(80).optional(),
  campaign: z.string().min(1).max(120).optional(),
  term: z.string().max(120).nullable().optional(),
  content: z.string().max(120).nullable().optional(),
})

// GET /api/v1/utm-links/[postId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { postId } = await params

  try {
    const utmLink = await prisma.uTMLink.findUnique({ where: { postId } })
    if (!utmLink) return notFound('UTM link não encontrado para este post')
    return ok(utmLink)
  } catch {
    return internalError()
  }
}

// PUT /api/v1/utm-links/[postId]
export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { postId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = UpdateUtmSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const existing = await prisma.uTMLink.findUnique({ where: { postId } })
    if (!existing) return notFound('UTM link não encontrado')

    const { term: _term, content, ...rest } = parsed.data
    const updated = await prisma.uTMLink.update({
      where: { postId },
      data: { ...rest, ...(content !== undefined ? { content: content ?? '' } : {}) },
    })

    if (user?.id) {
      await auditLog({
        action: 'utm_link.updated',
        entityType: 'UTMLink',
        entityId: existing.id,
        userId: user.id,
        metadata: { postId, changes: parsed.data },
      }).catch(() => undefined)
    }

    return ok(updated)
  } catch {
    return internalError()
  }
}

// DELETE /api/v1/utm-links/[postId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { postId } = await params

  try {
    const existing = await prisma.uTMLink.findUnique({ where: { postId } })
    if (!existing) return notFound('UTM link não encontrado')

    // Transação: deletar UTMLink + limpar Post.trackingUrl
    await prisma.$transaction([
      prisma.uTMLink.delete({ where: { postId } }),
      prisma.post.update({ where: { id: postId }, data: { trackingUrl: null } }),
    ])

    await auditLog({
      action: 'utm_link.deleted',
      entityType: 'UTMLink',
      entityId: existing.id,
      userId: user!.id,
      metadata: { postId },
    })

    return ok({ success: true })
  } catch {
    return internalError()
  }
}
