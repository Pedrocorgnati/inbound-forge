import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, ok, internalError } from '@/lib/api-auth'

const THRESHOLD = 5 // 5 cases + 5 dores validadas para habilitar o motor

// GET /api/v1/knowledge/threshold
export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [validatedCases, validatedPains] = await Promise.all([
      prisma.caseLibraryEntry.count({ where: { status: 'VALIDATED' } }),
      prisma.painLibraryEntry.count({ where: { status: 'VALIDATED' } }),
    ])

    const casesMet = validatedCases >= THRESHOLD
    const painsMet = validatedPains >= THRESHOLD

    return ok({
      cases: { validated: validatedCases, required: THRESHOLD, met: casesMet },
      pains: { validated: validatedPains, required: THRESHOLD, met: painsMet },
      motorUnlocked: casesMet && painsMet,
    })
  } catch {
    return internalError()
  }
}
