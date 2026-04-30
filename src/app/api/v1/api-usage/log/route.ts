import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, badRequest, internalError } from '@/lib/api-auth'
import { trackApiUsage } from '@/lib/api-usage-tracker'
import { ApiUsageLogBodySchema } from '@/schemas/health.schema'

export const runtime = 'nodejs'

type ApiService = 'anthropic' | 'ideogram' | 'flux' | 'browserless' | 'instagram'

// POST /api/v1/api-usage/log — workers registram uso após cada operação externa
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  // RESOLVED: G007 — 400 para JSON inválido (sintaxe), 422 para schema inválido (semântica)
  let body: unknown
  try { body = await request.json() } catch { return badRequest('Body inválido') }

  const parsed = ApiUsageLogBodySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  const { service, tokens, costUSD, operationId } = parsed.data

  try {
    await trackApiUsage({
      service: service as ApiService,
      tokens,
      costUSD,
      operationId,
      operatorId: user!.id,
    })

    return ok({ ok: true })
  } catch {
    return internalError()
  }
}
