import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  provider: z.enum(['anthropic', 'ideogram', 'instagram', 'supabase_url', 'supabase_anon']),
  key: z.string().min(10).max(4096),
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
    console.log('[credentials.patch] provider rotated', {
      provider: parsed.data.provider,
      operatorId: user.id,
      at: new Date().toISOString(),
    })

    return ok({
      provider: parsed.data.provider,
      pendingReload: true,
      instructions:
        'Atualize a variável correspondente em .env / Railway / Vercel e refaça deploy para aplicar.',
    })
  } catch (err) {
    console.error('[credentials.patch] error', err)
    return internalError()
  }
}
