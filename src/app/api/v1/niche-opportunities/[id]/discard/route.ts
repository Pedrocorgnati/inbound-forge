// TASK-11 (CL-249): descartar NicheOpportunity com motivo obrigatorio.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const DiscardSchema = z.object({
  reason: z.string().min(5).max(500),
})

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = DiscardSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const opp = await prisma.nicheOpportunity.findUnique({ where: { id } })
    if (!opp) return notFound('Oportunidade não encontrada')
    if (opp.status !== 'NEW') {
      return validationError(new Error(`Oportunidade já ${opp.status.toLowerCase()}`))
    }

    const updated = await prisma.nicheOpportunity.update({
      where: { id },
      data: {
        status: 'DISCARDED',
        reviewNote: parsed.data.reason,
        reviewedAt: new Date(),
        reviewedBy: user?.id ?? null,
      },
    })

    if (user?.id) {
      await auditLog({
        action: 'discard_niche_opportunity',
        entityType: 'NicheOpportunity',
        entityId: id,
        userId: user.id,
        metadata: { reason: parsed.data.reason },
      }).catch(() => undefined)
    }

    return ok(updated)
  } catch {
    return internalError()
  }
}
