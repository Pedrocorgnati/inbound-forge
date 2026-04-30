/**
 * GET /api/instagram/publishing-enabled — Status do kill-switch INSTAGRAM_PUBLISHING_LIVE
 *
 * Usado pelo `InstagramPublishButton` (TASK-12 / G-002) para desabilitar o
 * botao em < 60s quando o administrador desliga a flag (PostHog ou
 * env FEATURE_FLAGS_FORCE_OFF). Read-only, fail-safe (retorna `false` em erro).
 *
 * module-12-calendar-publishing | M11.8 | G-002
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, internalError } from '@/lib/api-auth'
import { isFeatureEnabled, FeatureFlags } from '@/lib/feature-flags'

export async function GET(_request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  try {
    const enabled = await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)
    return ok({ enabled })
  } catch {
    return internalError('Erro ao consultar kill-switch Instagram')
  }
}
