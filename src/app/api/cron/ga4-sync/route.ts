/**
 * Intake-Review TASK-7 ST002 (CL-103/104): cron diario para reconciliar
 * cliques (Shortlink/UTMLink) vs conversoes (Lead) e criar
 * ReconciliationItem quando divergencias forem detectadas.
 *
 * Chamado por Vercel Cron. Protegido por Bearer CRON_SECRET.
 * Agendamento em vercel.json: "0 3 * * *" (03:00 UTC diario).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  detectClicksWithoutConversion,
  detectConversionsWithoutPost,
} from '@/lib/reconciliation-detector'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [clicks, conversions] = await Promise.all([
      detectClicksWithoutConversion(),
      detectConversionsWithoutPost(),
    ])
    return NextResponse.json({
      ok: true,
      clicksWithoutConversion: clicks,
      conversionsWithoutPost: conversions,
      created: clicks + conversions,
      runAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron.ga4-sync]', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
