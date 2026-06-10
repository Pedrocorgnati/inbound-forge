/**
 * GET  /api/onboarding/state — estado atual do onboarding
 * PATCH /api/onboarding/state — avançar step, skip, complete ou reset
 * CL-249 (TASK-12 ST001)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, internalError, validationError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const PatchSchema = z.object({
  action: z.enum(['advance', 'skip', 'complete', 'reset']),
  step: z.number().int().min(0).optional(),
})

export async function GET() {
  const { user, response } = await requireSession()
  if (response) return response

  try {
    const op = await prisma.operator.findUnique({
      where: { id: user!.id },
      select: {
        onboardingStep: true,
        onboardingSkippedAt: true,
        onboardingCompletedAt: true,
        onboardingCompleted: true,
      },
    })
    return ok({
      step: op?.onboardingStep ?? 0,
      skippedAt: op?.onboardingSkippedAt ?? null,
      completedAt: op?.onboardingCompletedAt ?? null,
      completed: op?.onboardingCompleted ?? false,
    })
  } catch {
    return internalError()
  }
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { action, step } = parsed.data
  const now = new Date()

  try {
    let data: Record<string, unknown>

    switch (action) {
      case 'advance':
        data = { onboardingStep: step !== undefined ? step : { increment: 1 } }
        break
      case 'skip':
        data = { onboardingSkippedAt: now }
        break
      case 'complete':
        data = {
          onboardingCompleted: true,
          onboardingCompletedAt: now,
          onboardingSkippedAt: null,
        }
        break
      case 'reset':
        data = {
          onboardingStep: 0,
          onboardingCompleted: false,
          onboardingSkippedAt: null,
          onboardingCompletedAt: null,
        }
        break
    }

    const updated = await prisma.operator.update({
      where: { id: user!.id },
      data,
      select: {
        onboardingStep: true,
        onboardingSkippedAt: true,
        onboardingCompletedAt: true,
        onboardingCompleted: true,
      },
    })

    return ok({
      step: updated.onboardingStep,
      skippedAt: updated.onboardingSkippedAt,
      completedAt: updated.onboardingCompletedAt,
      completed: updated.onboardingCompleted,
    })
  } catch {
    return internalError()
  }
}
