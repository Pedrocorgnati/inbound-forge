// Inbound F4 — cron que envia os steps de nurture devidos. Bearer CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server'
import { processNurtureTick } from '@/lib/email/nurture'
import { captureException } from '@/lib/sentry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH = Number(process.env.NURTURE_TICK_BATCH ?? 50)

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await processNurtureTick(BATCH)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    captureException(err, { tags: { cron: 'nurture-tick' } })
    return NextResponse.json({ ok: false, error: 'processing_failed' }, { status: 500 })
  }
}
