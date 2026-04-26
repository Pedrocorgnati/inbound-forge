// POST /api/v1/themes/generate
// Módulo: module-7-theme-scoring-engine (TASK-1/ST002)
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { GenerateThemesSchema } from '@/schemas/theme.schema'
import { themeGenerationService } from '@/lib/services/theme-generation.service'

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = GenerateThemesSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await themeGenerationService.generate({
      forceRegenerate: parsed.data.forceRegenerate,
    })
    return ok({ generated: result.created, ...result })
  } catch (err) {
    console.error('[POST /themes/generate]', err)
    return internalError()
  }
}
