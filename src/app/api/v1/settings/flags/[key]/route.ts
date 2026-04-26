// TASK-14 (CL-251): GET/PUT de flags boolean. Admin-only (session required).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { FLAGS, getFlag, setFlag } from '@/lib/settings/get-flag'
import { requireSession, ok, validationError, internalError, badRequest } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const ALLOWED = new Set<string>(Object.values(FLAGS))
const PutSchema = z.object({ enabled: z.boolean() })

type Params = { params: Promise<{ key: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response
  const { key } = await params
  if (!ALLOWED.has(key)) return badRequest('Flag desconhecida')
  try {
    const value = await getFlag(key)
    return ok({ key, enabled: value })
  } catch {
    return internalError()
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response
  const { key } = await params
  if (!ALLOWED.has(key)) return badRequest('Flag desconhecida')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const previous = await getFlag(key)
    await setFlag(key, parsed.data.enabled, user?.id)
    if (user?.id) {
      await auditLog({
        action: 'toggle_system_flag',
        entityType: 'SystemSetting',
        entityId: key,
        userId: user.id,
        metadata: { previous, next: parsed.data.enabled },
      }).catch(() => undefined)
    }
    return ok({ key, enabled: parsed.data.enabled })
  } catch {
    return internalError()
  }
}
