/**
 * POST /api/v1/admin/workers/restart/preflight
 * Declara o impacto (downtime, cooldown) de reiniciar um worker Railway antes da acao.
 * Acao sensivel: exige dupla confirmacao; bloqueia quando o cooldown de 2min esta ativo.
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { WorkerRestartPreflightSchema } from '@/schemas/preflight.schema'
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

  const parsed = WorkerRestartPreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const impact = await estimateOperationImpact({
      kind: 'worker-restart',
      worker: parsed.data.worker,
    })
    return ok(impact)
  } catch (error) {
    console.error('[POST /api/v1/admin/workers/restart/preflight]', error)
    return internalError()
  }
}
