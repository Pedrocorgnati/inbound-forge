/**
 * POST /api/sources/:id/reset-protection
 * TASK-3 ST002 / CL-030
 *
 * Reset manual de marcacao anti-bot pelo operador. Zera flag + contador.
 * AUTH_001: JWT obrigatorio.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, notFound, internalError } from '@/lib/api-auth'
import { resetAntiBotProtection } from '@/lib/scraping/anti-bot-marker'

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { id } = await params

  try {
    const result = await resetAntiBotProtection(id, user!.id)
    if (!result.ok && result.code === 'NOT_FOUND') return notFound('Fonte nao encontrada.')

    console.info(`[anti-bot] Protection reset by operator | sourceId=${id} | userId=${user!.id}`)
    return ok({ success: true })
  } catch (err) {
    console.error('[reset-protection] error', err instanceof Error ? err.message : 'unknown')
    return internalError('Falha ao resetar protecao da fonte.')
  }
}
