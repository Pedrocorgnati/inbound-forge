// GET /api/v1/knowledge/quality-check — thresholds de KB (TASK-12 ST003 / CL-036)

import { requireSession, ok, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { KNOWLEDGE_STATUS } from '@/constants/status'

const THRESHOLDS = {
  cases: 5,
  pains: 5,
  patterns: 3,
  objections: 3,
}

export async function GET() {
  const { response } = await requireSession()
  if (response) return response
  try {
    const [cases, pains, patterns] = await Promise.all([
      prisma.caseLibraryEntry.count({ where: { status: KNOWLEDGE_STATUS.VALIDATED } }),
      prisma.painLibraryEntry.count({ where: { status: KNOWLEDGE_STATUS.VALIDATED } }),
      prisma.solutionPattern.count().catch(() => 0),
    ])
    const objections = 0 // ObjectionLibrary ainda nao existe no schema (roadmap)
    const counts = { cases, pains, patterns, objections }
    const deficits = {
      cases: Math.max(0, THRESHOLDS.cases - cases),
      pains: Math.max(0, THRESHOLDS.pains - pains),
      patterns: Math.max(0, THRESHOLDS.patterns - patterns),
      objections: Math.max(0, THRESHOLDS.objections - objections),
    }
    const totalDeficit = Object.values(deficits).reduce((a, b) => a + b, 0)
    return ok({ thresholds: THRESHOLDS, counts, deficits, healthy: totalDeficit === 0 })
  } catch {
    return internalError()
  }
}
