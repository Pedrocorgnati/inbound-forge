/**
 * POST /api/v1/angles/preflight
 * Estima custo/quota/timeout antes de uma geração paga de ângulos (Claude).
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TASK-003 (P0).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { AnglesPreflightSchema } from '@/schemas/preflight.schema'
import { estimatePreflight } from '@/lib/preflight/quota'

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = AnglesPreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const estimate = await estimatePreflight({ kind: 'angles', count: parsed.data.count })
    return ok(estimate)
  } catch (error) {
    console.error('[POST /api/v1/angles/preflight]', error)
    return internalError()
  }
}
