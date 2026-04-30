/**
 * POST /api/instagram/publish — Publicar post no Instagram via Graph API
 * Requer aprovação humana (INT-070). Verifica rate limits e token.
 * module-12-calendar-publishing | POST_050 | SYS_002 | SYS_003
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requireWorkerToken, ok, internalError, validationError } from '@/lib/api-auth'
import { InstagramService } from '@/lib/services/instagram.service'
import { canPublish, recordPublish, getRetryAfterSeconds } from '@/lib/middleware/instagram-rate-limiter'
import { isFeatureEnabled, FeatureFlags } from '@/lib/feature-flags'
import { logPublishAttempt } from '@/lib/audit/publish-audit'
import { z } from 'zod'

const publishSchema = z.object({
  postId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Aceita auth do worker (Bearer WORKER_AUTH_TOKEN) OU sessao do operador.
  // Worker chama backend-to-backend; operador chama via UI (cookie).
  if (!requireWorkerToken(request)) {
    const { response } = await requireSession()
    if (response) return response
  }

  // RESOLVED: G007 — safeParse para retornar 422 em vez de 500 para input inválido
  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = publishSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)
  const { postId } = parsed.data

  // TASK-12 ST001 (G-002): kill-switch INSTAGRAM_PUBLISHING_LIVE.
  // Quando flag desligada (PostHog ou env FEATURE_FLAGS_FORCE_OFF), bloqueia
  // toda publicacao manual em < 60s e registra audit log.
  const liveEnabled = await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)
  if (!liveEnabled) {
    await logPublishAttempt({
      postId,
      action: 'publish_blocked_kill_switch',
      result: 'failure',
      errorMessage: 'instagram_publishing_disabled (INSTAGRAM_PUBLISHING_LIVE=false)',
    }).catch(() => {})
    return NextResponse.json(
      {
        success: false,
        code: 'KILL_SWITCH_ON',
        error: 'Publicacao Instagram desativada pelo administrador. Tente novamente mais tarde.',
      },
      { status: 503 },
    )
  }

  // TASK-5 ST005: verificar rate limit antes de publicar (CL-057)
  const allowed = await canPublish()
  if (!allowed) {
    const retryAfter = await getRetryAfterSeconds()
    return NextResponse.json(
      { success: false, code: 'POST_429', error: 'Rate limit Instagram atingido. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    // RS-1 auto-UTM: garante trackingUrl antes do publish via Graph API.
    const { ensureUTMForPost } = await import('@/lib/services/utm-auto.service')
    await ensureUTMForPost(postId).catch(() => void 0)

    const result = await InstagramService.publishPost(postId)
    // Registrar publicação no sliding window após sucesso
    await recordPublish().catch(() => {})
    return ok(result, 201)
  } catch (error) {
    if (error instanceof Error) {
      const err = error as Error & { code?: string }

      if (err.code === 'POST_050') {
        return NextResponse.json(
          { success: false, error: { code: 'POST_050', message: err.message } },
          { status: 403 }
        )
      }
      if (err.code === 'SYS_002') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_002', message: err.message } },
          { status: 429 }
        )
      }
      if (err.code === 'SYS_003') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_003', message: err.message } },
          { status: 401 }
        )
      }
      if (err.code === 'SYS_004') {
        return NextResponse.json(
          { success: false, error: { code: 'SYS_004', message: err.message } },
          { status: 400 }
        )
      }
    }
    return internalError()
  }
}
