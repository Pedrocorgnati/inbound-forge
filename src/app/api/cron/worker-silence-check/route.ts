import { NextRequest, NextResponse } from 'next/server'
import { check, markEmailSent } from '@/lib/services/worker-silence-detector.service'
import { sendWorkerSilent } from '@/lib/services/email-alert.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await check()

    for (const opened of result.opened) {
      const r = await sendWorkerSilent({
        workerType: opened.workerType,
        lastHeartbeat: opened.lastHeartbeat,
        silentMinutes: opened.silentMinutes,
      })
      if (r.sent) {
        await markEmailSent(opened.workerType)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        opened: result.opened.map((o) => o.workerType),
        resolved: result.resolved.map((r) => r.workerType),
        skipped: result.skipped,
      },
    })
  } catch (err) {
    console.error('[cron.worker-silence-check] error', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
