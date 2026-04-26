import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SlotSchema = z.object({
  weekday: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

const PatchSchema = z.object({
  slots: z.array(SlotSchema).max(21),
  timezone: z.string().min(3).max(64),
})

type ScheduleState = z.infer<typeof PatchSchema>

const STORE: { value: ScheduleState | null } = { value: null }

export async function GET() {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse
  return ok(STORE.value ?? { slots: [], timezone: 'America/Sao_Paulo' })
}

export async function PATCH(req: NextRequest) {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    STORE.value = parsed.data
    return ok(parsed.data)
  } catch (err) {
    console.error('[settings.schedule.patch] error', err)
    return internalError()
  }
}
