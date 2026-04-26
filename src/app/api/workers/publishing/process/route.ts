/**
 * POST /api/workers/publishing/process
 * TASK-5 ST001 / intake-review Publishing Service
 *
 * Processa fila de publicações agendadas (CL-052).
 * Invocado pelo Vercel Cron a cada 5 minutos.
 * Protegido por CRON_SECRET via Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PublishingQueueService } from '@/lib/services/publishing-queue.service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Autenticação via CRON_SECRET (Vercel Cron envia este header)
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env['CRON_SECRET']

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await PublishingQueueService.processQueue()
    return NextResponse.json({ success: true, data: result, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[PublishingWorker] processQueue error', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
