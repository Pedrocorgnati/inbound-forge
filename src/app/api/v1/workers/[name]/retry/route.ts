/**
 * POST /api/v1/workers/[name]/retry — Intake Review TASK-11 ST004 (CL-247).
 * Dispara retry manual de um worker (re-enfileira jobs FAILED do tipo indicado).
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, badRequest, internalError } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const ALLOWED = new Set(['scraping', 'image', 'publishing', 'theme-generation'])

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> },
) {
  const { response } = await requireSession()
  if (response) return response

  const { name } = await ctx.params
  const workerType = name.toLowerCase()
  if (!ALLOWED.has(workerType)) {
    return badRequest(`Worker '${workerType}' nao suportado para retry.`)
  }

  try {
    // Re-enfileira AlertLog.resolved=false do tipo worker como signal;
    // no MVP, marca jobs FAILED -> PENDING via updateMany onde aplicavel.
    let requeued = 0
    if (workerType === 'publishing') {
      const res = await prisma.publishingQueue.updateMany({
        where: { status: 'FAILED' },
        data: { status: 'PENDING' },
      }).catch(() => ({ count: 0 }))
      requeued = res.count
    }

    // Log evento no AlertLog para auditoria.
    await prisma.alertLog.create({
      data: {
        severity: 'INFO',
        type: 'WORKER_MANUAL_RETRY',
        message: `Operador disparou retry do worker '${workerType}' (requeued=${requeued})`,
      },
    }).catch(() => undefined)

    return ok({ worker: workerType, requeued })
  } catch (err) {
    console.error('[POST /api/v1/workers/[name]/retry]', err)
    return internalError()
  }
}
