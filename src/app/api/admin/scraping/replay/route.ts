/**
 * Rastreabilidade: CL-050, TASK-6 ST004 (WK-WRK-06)
 * Admin: replay manual de jobs de scraping falhados.
 * POST { batch_id?: string, job_id?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit'

const BodySchema = z.object({
  batch_id: z.string().optional(),
  job_id: z.string().optional(),
}).refine((d) => d.batch_id ?? d.job_id, { message: 'batch_id ou job_id obrigatório' })

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response
  const userId = user!.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { batch_id, job_id } = parsed.data

  try {
    let count = 0

    if (job_id) {
      await prisma.workerJob.updateMany({
        where: { id: job_id, type: 'rescraping.batch' },
        data: { status: 'PENDING', retryCount: 0 },
      })
      count = 1
    } else if (batch_id) {
      const result = await prisma.workerJob.updateMany({
        where: {
          type: 'rescraping.batch',
          status: { in: ['FAILED', 'DEAD_LETTER'] },
          payload: { path: ['batchId'], equals: batch_id },
        },
        data: { status: 'PENDING', retryCount: 0 },
      })
      count = result.count
    }

    await auditLog({
      action: 'scraping.replay.triggered',
      entityType: 'WorkerJob',
      entityId: job_id ?? batch_id ?? 'unknown',
      userId,
      metadata: { batch_id, job_id, replayed: count },
    })

    return NextResponse.json({ ok: true, replayed: count })
  } catch (err) {
    console.error('[admin/scraping/replay] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
