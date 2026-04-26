// POST /api/v1/images/[jobId]/retry
// Intake-Review TASK-12 ST001 (CL-CG-008): retry manual de jobs FAILED.

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { requireSession, ok, notFound, conflict, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'

type Params = { params: Promise<{ jobId: string }> }

const REDIS_QUEUE_KEY = 'worker:image:queue'

export async function POST(_request: NextRequest, { params }: Params) {
  const { user, response } = await requireSession()
  if (response) return response

  const { jobId } = await params

  try {
    const job = await prisma.imageJob.findUnique({ where: { id: jobId } })
    if (!job) return notFound('Job de imagem nao encontrado')

    if (job.status !== 'FAILED') {
      return conflict(`Retry permitido apenas para jobs FAILED (atual: ${job.status})`)
    }

    const updated = await prisma.imageJob.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    })

    try {
      await redis.rpush(REDIS_QUEUE_KEY, JSON.stringify({ jobId }))
    } catch (err) {
      console.error('[IMAGE_JOB_RETRY] enqueue failed:', err instanceof Error ? err.message : err)
    }

    void auditLog({
      action: AUDIT_ACTIONS.IMAGE_JOB_RETRY,
      entityType: 'ImageJob',
      entityId: jobId,
      userId: user.id,
      metadata: { retryCount: updated.retryCount, previousStatus: 'FAILED' },
    })

    return ok({ id: updated.id, status: updated.status, retryCount: updated.retryCount })
  } catch {
    return internalError()
  }
}
