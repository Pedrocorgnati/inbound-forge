/**
 * Cron endpoint: monitor de expiracao de tokens (OpenAI/Instagram/GA4/Anthropic).
 * Schedule em vercel.json: "0 8 * * *" (TASK-8 ST003 / CL-249, WK-WRK-07).
 *
 * Da um lar real ao token-expiration-monitor que so existia no agregado
 * workers/railway.toml (removido) com `pnpm tsx` num projeto npm-only (bug
 * DC-ENV-01) — ou seja, nunca rodava. Reusa runTokenExpirationMonitor().
 *
 * OB-OBS-03: Vercel Cron dispara GET. SA-SEC-01: auth fail-CLOSED (sem CRON_SECRET = rejeita).
 */
import { NextRequest, NextResponse } from 'next/server'
import { runTokenExpirationMonitor } from '@/lib/services/token-expiration-monitor.service'
import { captureException } from '@/lib/sentry'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const reports = await runTokenExpirationMonitor()
    return NextResponse.json({ ok: true, count: reports.length, reports })
  } catch (err) {
    captureException(err, { cron: 'token-expiration' })
    console.error('[cron/token-expiration] erro:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
