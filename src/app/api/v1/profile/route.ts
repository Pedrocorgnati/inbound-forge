import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120),
})

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
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      data: { name: parsed.data.name },
    })
    if (error) return internalError(error.message)

    return ok({ name: parsed.data.name })
  } catch (err) {
    console.error('[profile.patch] error', err)
    return internalError()
  }
}
