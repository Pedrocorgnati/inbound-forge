// TASK-6 ST001 (CL-286): cron endpoint que dispara o scheduler de blog.
// Deve ser chamado a cada 5 min via Vercel Cron.

import { NextRequest, NextResponse } from 'next/server'
import { processScheduledArticles } from '@/workers/blog/scheduler-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await processScheduledArticles()
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[cron.blog-scheduler] error', err)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
