/**
 * GET    /api/v1/utm-links/[postId] — Buscar UTMLink por postId
 * DELETE /api/v1/utm-links/[postId] — Remover UTMLink + limpar Post.trackingUrl
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

type Params = { params: Promise<{ postId: string }> }

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
