import { NextRequest, NextResponse } from 'next/server'
import { requireSession, ok, badRequest, internalError } from '@/lib/api-auth'
import { trackApiUsage } from '@/lib/api-usage-tracker'
import { ZodError } from 'zod'
import { ApiUsageLogBodySchema } from '@/schemas/health.schema'

export const runtime = 'nodejs'

type ApiService = 'anthropic' | 'ideogram' | 'flux' | 'browserless' | 'instagram'

// POST /api/v1/api-usage/log — workers registram uso após cada operação externa
export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Corpo inválido')
  }

  let parsed: { service: ApiService; tokens?: number; costUSD: number; operationId?: string }
  try {
    parsed = ApiUsageLogBodySchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validação falhou', issues: err.errors },
        { status: 422 }
      )
    }
    return badRequest('Corpo inválido')
  }

  const { service, tokens, costUSD, operationId } = parsed

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
