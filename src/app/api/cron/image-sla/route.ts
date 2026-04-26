// TASK-10 ST002 (CL-209): cron que dispara o SLA monitor do image-generator.

import { NextRequest, NextResponse } from 'next/server'
import { runImageSlaMonitor } from '@/workers/image-generator/sla-monitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await runImageSlaMonitor()
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[cron.image-sla] error', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
