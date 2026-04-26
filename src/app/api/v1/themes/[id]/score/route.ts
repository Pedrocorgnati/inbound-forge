// POST /api/v1/themes/:id/score
// Módulo: module-7-theme-scoring-engine (TASK-2/ST002)
// Re-calcula score de um tema individual e retorna breakdown
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { apiError } from '@/constants/errors'
import { themeScoringService } from '@/lib/services/theme-scoring.service'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { id } = await params

  try {
    const result = await themeScoringService.calculateScore(id)
    return ok({
      score: result.finalScore,
      breakdown: {
        painRelevance: result.painRelevance,
        caseStrength: result.caseStrength,
        recencyBonus: result.recencyBonus,
        geoMultiplier: result.geoMultiplier,
        finalScore: result.finalScore,
      },
    })
  } catch (err) {
    const typedErr = err as { code?: string; message: string }
    if (typedErr?.code === 'THEME_080') {
      const { status, body } = apiError('THEME_080')
      return NextResponse.json(body, { status })
    }
    console.error('[POST /themes/:id/score]', err)
    return internalError()
  }
}
