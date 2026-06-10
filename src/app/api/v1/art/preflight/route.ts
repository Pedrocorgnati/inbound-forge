/**
 * POST /api/v1/art/preflight
 * Estima custo/quota/timeout antes de uma geração paga de arte (Ideogram/Flux).
 * O provider (e portanto o custo) é resolvido a partir do templateType.
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TASK-003 (P0).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { ArtPreflightSchema } from '@/schemas/preflight.schema'
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

  const parsed = ArtPreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const estimate = await estimatePreflight({
      kind: 'art',
      count: parsed.data.count,
      templateType: parsed.data.templateType,
    })
    return ok(estimate)
  } catch (error) {
    console.error('[POST /api/v1/art/preflight]', error)
    return internalError()
  }
}
