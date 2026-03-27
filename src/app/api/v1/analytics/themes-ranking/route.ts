import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'

// GET /api/v1/analytics/themes-ranking
export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    // TODO: Implementar via /auto-flow execute — learn-to-rank completo
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

    return ok(themes)
  } catch {
    return internalError()
  }
}
