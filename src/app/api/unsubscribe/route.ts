// Inbound F1 — unsubscribe one-click (RFC 8058). GET (link no email) e POST
// (List-Unsubscribe-Post) descadastram sem login. Rota publica (isenta no middleware).
import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/lib/email/subscriber'
import { DEFAULT_LOCALE } from '@/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const ok = token ? (await unsubscribeByToken(token).catch(() => ({ ok: false }))).ok : false
  return { ok }
}

export async function GET(request: NextRequest) {
  const { ok } = await handle(request)
  const path = ok ? `/${DEFAULT_LOCALE}/unsubscribed` : `/${DEFAULT_LOCALE}/unsubscribed?error=1`
  return NextResponse.redirect(new URL(path, request.url))
}

// RFC 8058 one-click: provedores fazem POST direto no link de List-Unsubscribe.
export async function POST(request: NextRequest) {
  const { ok } = await handle(request)
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 })
}
