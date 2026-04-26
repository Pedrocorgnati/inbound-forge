// TASK-8 ST001 (CL-292, CL-293): GET/PUT de SystemSetting.
// GET retorna os defaults mergeados com o DB. PUT aceita payload parcial.

import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getAllSystemSettings,
  upsertSystemSetting,
  SYSTEM_SETTING_KEYS,
} from '@/lib/settings/system-settings'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const UpdateSchema = z.object({
  monthlyBudgetBRL: z.number().min(0).max(1_000_000).optional(),
  alertsEmail: z.string().email().optional(),
  learnToRank: z
    .object({
      minPosts: z.number().int().min(10).max(10_000),
      minConversions: z.number().int().min(1).max(10_000),
    })
    .optional(),
  themeThrottle: z
    .object({
      perHour: z.number().int().min(1).max(100),
      perDay: z.number().int().min(1).max(1_000),
    })
    .optional(),
})

export async function GET() {
  const { response } = await requireSession()
  if (response) return response

  try {
    const data = await getAllSystemSettings()
    return ok(data)
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
    const previous = await getAllSystemSettings()

    if (parsed.data.monthlyBudgetBRL !== undefined) {
      await upsertSystemSetting(
        SYSTEM_SETTING_KEYS.MONTHLY_BUDGET_BRL,
        parsed.data.monthlyBudgetBRL,
        user?.id
      )
    }
    if (parsed.data.alertsEmail !== undefined) {
      await upsertSystemSetting(
        SYSTEM_SETTING_KEYS.ALERTS_EMAIL,
        parsed.data.alertsEmail,
        user?.id
      )
    }
    if (parsed.data.learnToRank !== undefined) {
      await upsertSystemSetting(
        SYSTEM_SETTING_KEYS.LEARN_TO_RANK,
        parsed.data.learnToRank,
        user?.id
      )
    }
    if (parsed.data.themeThrottle !== undefined) {
      await upsertSystemSetting(
        SYSTEM_SETTING_KEYS.THEME_THROTTLE,
        parsed.data.themeThrottle,
        user?.id
      )
    }

    const next = await getAllSystemSettings()

    if (user?.id) {
      await auditLog({
        action: 'update_system_settings',
        entityType: 'SystemSetting',
        entityId: 'global',
        userId: user.id,
        metadata: { previous, next, changed: Object.keys(parsed.data) },
      }).catch(() => undefined)
    }

    return ok(next)
  } catch {
    return internalError()
  }
}
