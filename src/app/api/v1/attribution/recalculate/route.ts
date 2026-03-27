/**
 * POST /api/v1/attribution/recalculate — Recalcular atribuição por tema
 * Recalcula score de conversão para todos os leads de um tema
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { updateThemeConversionScore } from '@/lib/conversion-score'
import { auditLog } from '@/lib/audit'

const Schema = z.object({ themeId: z.string().uuid() })

// POST /api/v1/attribution/recalculate
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const leadsCount = await prisma.lead.count({
      where: { firstTouchThemeId: parsed.data.themeId },
    })

    // Recalcular score (CX-01)
    await updateThemeConversionScore(parsed.data.themeId)

    // COMP-001: auditLog após recalculação
    await auditLog({
      action: 'attribution.recalculated',
      entityType: 'Theme',
      entityId: parsed.data.themeId,
      userId: user!.id,
      metadata: { leadsCount },
    })

    return ok({ updated: leadsCount, themeId: parsed.data.themeId })
  } catch {
    return internalError()
  }
}
