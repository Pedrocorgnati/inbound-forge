/**
 * Rastreabilidade: CL-046, TASK-6 ST003
 * Cron endpoint: re-scraping semanal (terça 03:00 UTC).
 * Schedule em vercel.json: "0 3 * * 2"
 */
import { NextRequest, NextResponse } from 'next/server'
import { run } from '@/workers/rescraping.worker'
import { captureException } from '@/lib/sentry'

// OB-OBS-03: Vercel Cron dispara GET; este handler era POST-only -> 405 -> nunca
// executava. SA-SEC-01: auth fail-CLOSED (sem CRON_SECRET = rejeita).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await run()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    // OB-OBS-02: console.error nao forwarda para o Sentry.
    captureException(err, { cron: 'rescraping' })
    console.error('[cron/rescraping] erro:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
