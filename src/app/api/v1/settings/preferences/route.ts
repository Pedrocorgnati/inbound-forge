import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PreferencesSchema = z.object({
  language: z.enum(['pt-BR', 'en-US', 'it-IT', 'es-ES']),
  darkMode: z.boolean(),
  emailNotifications: z.boolean(),
  degradedMode: z.boolean(),
})

type Preferences = z.infer<typeof PreferencesSchema>

const STORE: { value: Preferences | null } = { value: null }

const DEFAULTS: Preferences = {
  language: 'pt-BR',
  darkMode: false,
  emailNotifications: true,
  degradedMode: false,
}

export async function GET() {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse
  return ok(STORE.value ?? DEFAULTS)
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

  const parsed = PreferencesSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    STORE.value = parsed.data
    return ok(parsed.data)
  } catch (err) {
    console.error('[settings.preferences.patch] error', err)
    return internalError()
  }
}
