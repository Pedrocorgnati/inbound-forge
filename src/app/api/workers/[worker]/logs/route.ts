// GET /api/workers/[worker]/logs?since=<iso> — logs agregados (TASK-7 ST004 / CL-254)

import { NextRequest, NextResponse } from 'next/server'
import { requireSession, internalError } from '@/lib/api-auth'
import { getWorkerLogs } from '@/lib/services/worker-log-aggregator.service'

const WORKERS = ['scraping', 'image', 'video', 'publishing'] as const

type Params = { params: Promise<{ worker: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireSession()
  if (response) return response

  const { worker } = await params
  if (!WORKERS.includes(worker as (typeof WORKERS)[number])) {
    return NextResponse.json(
      { success: false, code: 'WORKER_UNKNOWN', message: `Worker "${worker}" desconhecido.` },
      { status: 400 },
    )
  }

  const sinceRaw = new URL(request.url).searchParams.get('since')
  let since: string | null = null
  if (sinceRaw) {
    const d = new Date(sinceRaw)
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { success: false, code: 'INVALID_SINCE', message: 'Parametro "since" deve ser ISO-8601.' },
        { status: 422 },
      )
    }
    since = d.toISOString()
  }

  try {
    const entries = await getWorkerLogs(worker, since)
    return NextResponse.json({
      success: true,
      worker,
      count: entries.length,
      serverTime: new Date().toISOString(),
      entries,
    })
  } catch (err) {
    console.error('[workers/logs] falha:', err instanceof Error ? err.message : err)
    return internalError()
  }
}
