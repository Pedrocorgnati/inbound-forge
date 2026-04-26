import { NextRequest, NextResponse } from 'next/server'
import { requireSession, validationError, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  getActivationForOperator,
  hasReachedActivationThreshold,
  recordActivation,
} from '@/lib/onboarding/activation-event'

export const runtime = 'nodejs'

// GET /api/v1/onboarding/activation — retorna se o operator ja ativou
export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response
  try {
    const event = await getActivationForOperator(user!.id)
    return NextResponse.json({ activated: !!event, event })
  } catch {
    return internalError()
  }
}

// POST /api/v1/onboarding/activation — idempotente; so registra se threshold 5+5 ok
export async function POST(_req: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    const [casesCount, painsCount] = await Promise.all([
      prisma.caseLibraryEntry.count(),
      prisma.painLibraryEntry.count(),
    ])

    if (!hasReachedActivationThreshold(casesCount, painsCount)) {
      return validationError(
        new Error(
          `Threshold de ativacao nao atingido (cases=${casesCount}/${5}, pains=${painsCount}/${5})`
        )
      )
    }

    const result = await recordActivation({
      operatorId: user!.id,
      casesCount,
      painsCount,
      meta: { triggeredFrom: 'onboarding-ui' },
    })

    return NextResponse.json({
      ok: true,
      recorded: result.recorded,
      eventId: result.eventId,
      casesCount,
      painsCount,
    })
  } catch {
    return internalError()
  }
}
