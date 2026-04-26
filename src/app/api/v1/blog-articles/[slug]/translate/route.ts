/**
 * POST /api/v1/blog-articles/[slug]/translate — Intake Review TASK-13 ST002 (CL-165..168).
 * Body: { locales: string[] }
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, badRequest, validationError, internalError } from '@/lib/api-auth'
import { translateArticleToLocales } from '@/lib/services/blog-translation.service'

const BodySchema = z.object({
  locales: z.array(z.string().min(2).max(10)).min(1).max(5),
})

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { response } = await requireSession()
  if (response) return response

  const { slug } = await ctx.params
  if (!slug) return badRequest('Slug requerido')

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return badRequest('JSON invalido')
  }

  const parsed = BodySchema.safeParse(payload)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const results = await translateArticleToLocales(slug, parsed.data.locales)
    return ok({ results })
  } catch (err) {
    console.error('[POST /api/v1/blog-articles/[slug]/translate]', err)
    return internalError()
  }
}
