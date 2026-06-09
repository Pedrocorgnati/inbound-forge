/**
 * Rastreabilidade: CL-197, TASK-3 ST001
 * Cron endpoint: reconciliação semanal — segunda 12:00 UTC (09:00 BRT).
 * Schedule em vercel.json: "0 12 * * 1"
 */
import { NextRequest, NextResponse } from 'next/server'
import { runWithHealthTracking } from '@/workers/reconciliation.worker'
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
    const result = await runWithHealthTracking()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    // OB-OBS-02: console.error nao forwarda para o Sentry.
    captureException(err, { cron: 'reconciliation' })
    console.error('[cron/reconciliation] erro:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
