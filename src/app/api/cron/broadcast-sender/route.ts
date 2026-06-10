// Inbound F1 — cron que drena broadcasts: promove SCHEDULED devidos -> SENDING e
// envia lotes via Resend. Bearer CRON_SECRET (middleware isenta /api/cron/*).
// Espelha /api/cron/blog-scheduler. Lote pequeno por tick p/ caber no timeout da Vercel.
import { NextRequest, NextResponse } from 'next/server'
import { processSendingBroadcasts } from '@/lib/email/broadcast-sender'
import { captureException } from '@/lib/sentry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH = Number(process.env.BROADCAST_SEND_BATCH ?? 50)

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await processSendingBroadcasts(BATCH)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    captureException(err, { tags: { cron: 'broadcast-sender' } })
    return NextResponse.json({ ok: false, error: 'processing_failed' }, { status: 500 })
  }
}
