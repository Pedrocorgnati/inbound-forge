/**
 * GET /api/sources
 * POST /api/sources
 * TASK-4 ST001 / module-6-scraping-worker
 *
 * Listagem e criação de fontes de scraping.
 * INT-136: bloqueia domínios proibidos na criação.
 * AUTH_001: JWT obrigatório.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, okPaginated, validationError, conflict, internalError } from '@/lib/api-auth'
import { listSources, createSource } from '@/lib/services/source.service'

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(1024),
  selector: z.string().max(512).optional(),
  crawlFrequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
})

export async function GET(request: NextRequest) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const isActiveStr = searchParams.get('isActive')
  const isActive = isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined

  try {
    const sources = await listSources(user!.id, { isActive })
    return okPaginated(sources, { page: 1, limit: sources.length, total: sources.length })
  } catch (err) {
    console.error('[Sources] GET error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}

export async function POST(request: NextRequest) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body JSON inválido'))
  }

  const parsed = CreateSourceSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const result = await createSource(user!.id, parsed.data)

    if (!result.ok) {
      if (result.code === 'BLOCKED_DOMAIN') {
        return conflict('Domínio não permitido para scraping (INT-136).')
      }
      return conflict('Esta URL já está cadastrada como fonte.')
    }

    return ok(result.source, 201)
  } catch (err) {
    console.error('[Sources] POST error', err instanceof Error ? err.message : 'unknown')
    return internalError()
  }
}
