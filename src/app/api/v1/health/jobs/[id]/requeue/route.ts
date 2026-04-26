/**
 * TASK-4 ST005 (CL-TH-059): requeue manual de jobs em DEAD_LETTER.
 * Muda status DEAD_LETTER -> PENDING, zera retryCount, registra AuditLog.
 */
import { NextRequest } from 'next/server'
import { requireSession, ok, validationError, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { requeueDeadLetter } from '@/lib/workers/track-job'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession()
  if (response) return response

  const { id } = await params
  if (!id) return validationError(new Error('id obrigatorio'))

  try {
    const job = await requeueDeadLetter(id)
    if (!job) {
      return validationError(new Error('Job nao encontrado ou nao esta em DEAD_LETTER'))
    }

    await auditLog({
      action: AUDIT_ACTIONS.WORKER_JOB_REQUEUE,
      entityType: 'WorkerJob',
      entityId: job.id,
      userId: user!.id,
      metadata: { jobId: job.id },
    })

    return ok({ id: job.id, status: 'PENDING' })
  } catch {
    return internalError()
  }
}
