/**
 * POST /api/v1/translate/preflight
 * Declara o impacto (custo Claude por locale, escopo) de traduzir um artigo antes da acao.
 * Bloqueia quando o custo estimado excede a quota mensal restante.
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { TranslatePreflightSchema } from '@/schemas/preflight.schema'
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

  const parsed = TranslatePreflightSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const impact = await estimateOperationImpact({
      kind: 'translate',
      articleId: parsed.data.articleId,
      targetLocales: parsed.data.targetLocales,
    })
    return ok(impact)
  } catch (error) {
    console.error('[POST /api/v1/translate/preflight]', error)
    return internalError()
  }
}
