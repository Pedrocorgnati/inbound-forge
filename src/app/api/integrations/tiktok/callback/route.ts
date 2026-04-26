/**
 * GET /api/integrations/tiktok/callback
 * TASK-6 ST001 / CL-072 (pos-MVP)
 *
 * OAuth callback do TikTok. Valida state (CSRF), troca code por tokens
 * e persiste em operator settings.
 *
 * PENDENTE (PENDING-ACTIONS): Modelo `OperatorIntegration` nao existe ainda
 * — tokens sao armazenados temporariamente no campo JSON `operator.metadata`.
 * Criar migracao `add_operator_integration_credentials` antes de ir para prod.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { redis } from '@/lib/redis'
import { TikTokClient } from '@/lib/integrations/tiktok/client'

export const dynamic = 'force-dynamic'

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/tiktok/callback`
const STATE_TTL = 600

export async function GET(request: NextRequest) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.warn(`[tiktok-callback] OAuth error: ${error} | userId=${user!.id}`)
    return NextResponse.redirect(new URL('/settings/integrations?tiktok=error', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/integrations?tiktok=missing_params', request.url))
  }

  // Validar state (CSRF)
  const storedState = await redis.get<string>(`oauth:tiktok:state:${user!.id}`)
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/settings/integrations?tiktok=invalid_state', request.url))
  }
  await redis.del(`oauth:tiktok:state:${user!.id}`)

  try {
    const client = new TikTokClient()
    const tokens = await client.exchangeCode(code, REDIRECT_URI)

    // NOTA: armazenar tokens em Redis ate que o modelo de credenciais seja criado
    // PENDENTE: migrar para tabela `operator_integrations` (ver PENDING-ACTIONS.md)
    await redis.setex(
      `integration:tiktok:tokens:${user!.id}`,
      tokens.expiresAt - Date.now(),
      JSON.stringify(tokens)
    )

    console.info(`[tiktok-callback] Tokens armazenados | userId=${user!.id} | openId=${tokens.openId}`)
    return NextResponse.redirect(new URL('/settings/integrations?tiktok=connected', request.url))
  } catch (err) {
    console.error('[tiktok-callback] exchange falhou', err instanceof Error ? err.message : 'unknown')
    return NextResponse.redirect(new URL('/settings/integrations?tiktok=exchange_error', request.url))
  }
}

/** Gera URL de authorize e salva state no Redis (chamado pela UI) */
export async function POST(_request: NextRequest) {
  const { user, response: authError } = await requireSession()
  if (authError) return authError

  const state = crypto.randomUUID()
  await redis.setex(`oauth:tiktok:state:${user!.id}`, STATE_TTL, state)

  const client = new TikTokClient()
  const authUrl = client.buildAuthUrl(REDIRECT_URI, state)

  return NextResponse.json({ authUrl })
}
