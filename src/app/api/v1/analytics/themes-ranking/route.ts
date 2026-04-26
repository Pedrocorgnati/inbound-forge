import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { isLtrActive, calculateLtrScores } from '@/lib/services/learn-to-rank.service'

// GET /api/v1/analytics/themes-ranking
// TASK-13 ST001 (CL-096): LTR ativo quando threshold atingido; fallback estatico.
export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const ltrActive = await isLtrActive()

    const themes = await prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { opportunityScore: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        opportunityScore: true,
        conversionScore: true,
        status: true,
        _count: { select: { contentPieces: true, firstTouchLeads: true } },
      },
    })

    if (!ltrActive) {
      return ok({
        rankingMode: 'static' as const,
        reason: 'LTR threshold nao atingido — ranking por opportunityScore estatico',
        themes,
      })
    }

    // LTR ativo: aplica ajustes calculados do learn-to-rank sobre conversionScore
    const ltrUpdates = await calculateLtrScores()
    const adjustmentByTheme = new Map(ltrUpdates.map((u) => [u.themeId, u]))

    const ranked = themes
      .map((t) => {
        const ltr = adjustmentByTheme.get(t.id)
        return {
          ...t,
          ltrAdjustedScore: ltr?.newScore ?? t.conversionScore,
          ltrAdjustment: ltr?.adjustment ?? 1.0,
        }
      })
      .sort((a, b) => b.ltrAdjustedScore - a.ltrAdjustedScore)

    return ok({
      rankingMode: 'ltr' as const,
      reason: 'LTR ativo — ranking por conversionScore ajustado',
      themes: ranked,
    })
  } catch {
    return internalError()
  }
}
