/**
 * POST /api/v1/onboarding/seed-defaults — Intake Review TASK-2 ST003
 *
 * Executa o seed das 10 dores MVP pre-configuradas (isDefault=true) de forma
 * idempotente (upsert por title). Consumo pelo OnboardingWizard quando o
 * operador escolhe "usar base pre-configurada".
 */
import { NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { seedMvpPains, MVP_PAINS } from '@/lib/onboarding/mvp-pains'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const result = await seedMvpPains(prisma)
    logger.info('onboarding.seed-defaults', 'seed executado', {
      inserted: result.inserted,
      existing: result.existing,
      total: MVP_PAINS.length,
    })
    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      existing: result.existing,
      total: MVP_PAINS.length,
    })
  } catch (err) {
    logger.error('onboarding.seed-defaults', 'falha ao executar seed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return internalError()
  }
}
