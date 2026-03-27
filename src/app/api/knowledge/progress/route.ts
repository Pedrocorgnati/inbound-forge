import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { KNOWLEDGE_THRESHOLDS, THRESHOLD_NUDGES } from '@/lib/constants/thresholds'

/**
 * GET /api/knowledge/progress
 *
 * Retorna contadores de progresso da knowledge base.
 * Queries executadas em paralelo (Promise.all) — sem waterfall.
 * Cache-Control: max-age=10 (10s).
 *
 * Fallback gracioso em caso de falha de DB (SYS_001):
 * retorna zeros com header X-Fallback: true.
 */
export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    // 4 queries em paralelo — sem waterfall (PERF)
    const [casesCount, painsCount, patternsCount, objectionsCount] = await Promise.all([
      prisma.caseLibraryEntry.count(),
      prisma.painLibraryEntry.count(),
      prisma.solutionPattern.count(),
      prisma.objection.count(),
    ])

    const t = KNOWLEDGE_THRESHOLDS

    // Calcular unlocked por entidade
    const casesUnlocked = casesCount >= t.cases
    const painsUnlocked = painsCount >= t.pains
    const patternsUnlocked = patternsCount >= t.patterns
    const objectionsUnlocked = objectionsCount >= t.objections

    // overallUnlocked depende do cases (critério principal)
    const overallUnlocked = casesUnlocked

    // Nudge contextual
    let nextNudge: string | null = null
    if (casesCount === 0) {
      nextNudge = THRESHOLD_NUDGES.cases_zero
    } else if (casesCount < t.cases) {
      nextNudge = THRESHOLD_NUDGES.cases_partial(casesCount)
    } else if (painsCount === 0) {
      nextNudge = THRESHOLD_NUDGES.pains_zero
    } else if (patternsCount < t.patterns) {
      nextNudge = THRESHOLD_NUDGES.patterns_low
    } else {
      nextNudge = THRESHOLD_NUDGES.cases_reached
    }

    const body = {
      success: true,
      data: {
        cases: { count: casesCount, threshold: t.cases, unlocked: casesUnlocked },
        pains: { count: painsCount, threshold: t.pains, unlocked: painsUnlocked },
        patterns: { count: patternsCount, threshold: t.patterns, unlocked: patternsUnlocked },
        objections: { count: objectionsCount, threshold: t.objections, unlocked: objectionsUnlocked },
        overallUnlocked,
        nextNudge,
      },
    }

    return NextResponse.json(body, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=10, s-maxage=10',
      },
    })
  } catch (err) {
    // SYS_001 — DB indisponível: fallback gracioso
    console.error('[/api/knowledge/progress] DB error:', err)

    const fallback = {
      success: false,
      data: {
        cases: { count: 0, threshold: KNOWLEDGE_THRESHOLDS.cases, unlocked: false },
        pains: { count: 0, threshold: KNOWLEDGE_THRESHOLDS.pains, unlocked: false },
        patterns: { count: 0, threshold: KNOWLEDGE_THRESHOLDS.patterns, unlocked: false },
        objections: { count: 0, threshold: KNOWLEDGE_THRESHOLDS.objections, unlocked: false },
        overallUnlocked: false,
        nextNudge: null,
      },
    }

    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        'X-Fallback': 'true',
        'Cache-Control': 'no-store',
      },
    })
  }
}
