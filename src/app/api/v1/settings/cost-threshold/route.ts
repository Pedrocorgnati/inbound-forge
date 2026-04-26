// Intake-Review TASK-5 ST001 (CL-225): GET/PUT dedicado para threshold de custo USD.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getMonthlyCostThresholdUsd,
  upsertSystemSetting,
  SYSTEM_SETTING_KEYS,
} from '@/lib/settings/system-settings'
import { getMonthlyTotalAll } from '@/lib/cost-tracking'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

const UpdateSchema = z.object({
  monthlyCostThresholdUsd: z.number().min(0).max(1_000),
})

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const [threshold, currentSpendUsd] = await Promise.all([
      getMonthlyCostThresholdUsd(),
      getMonthlyTotalAll(),
    ])
    return ok({ monthlyCostThresholdUsd: threshold, currentSpendUsd })
  } catch {
    return internalError()
  }
}

export async function PUT(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    await upsertSystemSetting(
      SYSTEM_SETTING_KEYS.MONTHLY_COST_THRESHOLD_USD,
      parsed.data.monthlyCostThresholdUsd,
      user?.id,
    )
    return ok({ monthlyCostThresholdUsd: parsed.data.monthlyCostThresholdUsd })
  } catch {
    return internalError()
  }
}
