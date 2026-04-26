// TASK-11 (CL-249): aprovar NicheOpportunity -> cria Theme + marca APPROVED.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const ApproveSchema = z.object({
  title: z.string().min(3).max(500),
  note: z.string().max(500).optional(),
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
  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const opp = await prisma.nicheOpportunity.findUnique({ where: { id } })
    if (!opp) return notFound('Oportunidade não encontrada')
    if (opp.status !== 'NEW') {
      return validationError(new Error(`Oportunidade já ${opp.status.toLowerCase()}`))
    }

    const result = await prisma.$transaction(async (tx) => {
      const theme = await tx.theme.create({
        data: {
          title: parsed.data.title,
          nicheOpportunityId: id,
          opportunityScore: opp.potentialScore,
        },
      })
      const updated = await tx.nicheOpportunity.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewNote: parsed.data.note ?? null,
          reviewedAt: new Date(),
          reviewedBy: user?.id ?? null,
          themeId: theme.id,
        },
      })
      return { theme, opportunity: updated }
    })

    if (user?.id) {
      await auditLog({
        action: 'approve_niche_opportunity',
        entityType: 'NicheOpportunity',
        entityId: id,
        userId: user.id,
        metadata: { themeId: result.theme.id, title: parsed.data.title },
      }).catch(() => undefined)
    }

    return ok(result, 201)
  } catch {
    return internalError()
  }
}
