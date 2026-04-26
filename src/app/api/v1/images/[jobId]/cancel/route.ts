// POST /api/v1/images/[jobId]/cancel
// Intake-Review TASK-12 ST002 (CL-CG-009): cancelar job PENDING/RUNNING.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { requireSession, ok, notFound, conflict, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'

type Params = { params: Promise<{ jobId: string }> }

const REDIS_CANCEL_SIGNAL_KEY = 'worker:image:cancel'

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { jobId } = await params

  try {
    const job = await prisma.imageJob.findUnique({ where: { id: jobId } })
    if (!job) return notFound('Job de imagem nao encontrado')

    if (job.status !== 'PENDING' && job.status !== 'RUNNING') {
      return conflict(`Cancel permitido apenas para PENDING ou RUNNING (atual: ${job.status})`)
    }

    const updated = await prisma.imageJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    })

    // Sinal best-effort para worker interromper se estiver RUNNING
    try {
      await redis.sadd(REDIS_CANCEL_SIGNAL_KEY, jobId)
      await redis.expire(REDIS_CANCEL_SIGNAL_KEY, 3600)
    } catch (err) {
      console.error('[IMAGE_JOB_CANCEL] signal failed:', err instanceof Error ? err.message : err)
    }

    void auditLog({
      action: AUDIT_ACTIONS.IMAGE_JOB_CANCEL,
      entityType: 'ImageJob',
      entityId: jobId,
      userId: user.id,
      metadata: { previousStatus: job.status },
    })

    return ok({ id: updated.id, status: updated.status })
  } catch {
    return internalError()
  }
}
