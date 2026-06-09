/**
 * Rastreabilidade: CL-307, TASK-4 ST004
 * Cron endpoint: budget burn rate check a cada 6h.
 * Auth: header Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/workers/budget-monitor.worker'
import { captureException } from '@/lib/sentry'

// OB-OBS-03: Vercel Cron dispara GET; este handler era POST-only -> 405 -> nunca
// executava. SA-SEC-01: auth fail-CLOSED (sem CRON_SECRET = rejeita), alinhado a
// worker-silence-check/ga4-sync/lgpd-purge.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await run()
    return NextResponse.json({ ok: true })
  } catch (err) {
    // OB-OBS-02: console.error nao forwarda para o Sentry.
    captureException(err, { cron: 'budget-check' })
    console.error('[cron/budget-check] erro:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
