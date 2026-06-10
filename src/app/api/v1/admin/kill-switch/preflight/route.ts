/**
 * POST /api/v1/admin/kill-switch/preflight
 * Declara o impacto de ativar/religar um kill-switch (feature flag) antes da acao.
 * Acao sensivel: sempre exige dupla confirmacao (requires_double_confirm=true).
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { KillSwitchPreflightSchema } from '@/schemas/preflight.schema'
import { estimateOperationImpact } from '@/lib/preflight/operations'

export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError(new Error('Body inválido'))
  }

  const parsed = KillSwitchPreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const impact = await estimateOperationImpact({
      kind: 'kill-switch',
      flag: parsed.data.flag,
      action: parsed.data.action,
    })
    return ok(impact)
  } catch (error) {
    console.error('[POST /api/v1/admin/kill-switch/preflight]', error)
    return internalError()
  }
}
