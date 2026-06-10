/**
 * Rastreabilidade: CL-197, TASK-3 ST006
 * Admin: disparo manual da reconciliação com force=true (ignora idempotency window).
 */
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { runWithHealthTracking } from '@/workers/reconciliation.worker'

export async function POST() {
  const { user, response } = await requireSession()
  if (response) return response
  void user

  try {
    const result = await runWithHealthTracking(true)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[admin/reconciliation/trigger] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
