import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { runProbeForTheme } from '@/lib/services/asov.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PostSchema = z.object({
  themeId: z.string().uuid(),
  llms: z.array(z.enum(['perplexity', 'chatgpt_search', 'gemini'])).optional(),
})

export async function POST(req: NextRequest) {
  const { user, response } = await requireSession()
  if (!user) return response as NextResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const results = await runProbeForTheme(parsed.data.themeId, parsed.data.llms)
    return ok({ results })
  } catch (err) {
    console.error('[analytics.asov.probe] error', err)
    return internalError()
  }
}
