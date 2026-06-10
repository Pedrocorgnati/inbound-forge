// Inbound F1 — confirmacao de double-opt-in (clicado no email). Redireciona para
// pagina publica de feedback. Rota publica (isenta no middleware).
import { NextRequest, NextResponse } from 'next/server'
import { confirmSubscriber } from '@/lib/email/subscriber'
import { enrollSubscriber } from '@/lib/email/nurture'
import { DEFAULT_LOCALE } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function redirect(request: NextRequest, ok: boolean) {
  const locale = DEFAULT_LOCALE
  const path = ok ? `/${locale}/subscribe/confirmed` : `/${locale}/subscribe/confirmed?error=1`
  return NextResponse.redirect(new URL(path, request.url))
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  if (!token) return redirect(request, false)
  const result = await confirmSubscriber(token).catch(() => ({ ok: false }) as { ok: boolean; subscriberId?: string })
  // F4: ao confirmar, inscreve nas sequences de nurture ativas (best-effort).
  if (result.ok && result.subscriberId) {
    await enrollSubscriber(result.subscriberId).catch(() => undefined)
  }
  return redirect(request, result.ok)
}
