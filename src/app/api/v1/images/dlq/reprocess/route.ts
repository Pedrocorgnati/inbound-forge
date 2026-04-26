// POST /api/v1/images/dlq/reprocess
// Intake-Review TASK-12 ST003 (CL-CG-011/038): reprocessar DLQ (single ou bulk).

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { requireSession, ok, badRequest, validationError, internalError } from '@/lib/api-auth'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'

const REDIS_QUEUE_KEY = 'worker:image:queue'
const MAX_OPS = 100

const BodySchema = z
  .object({
    jobIds: z.array(z.string().uuid()).min(1).max(MAX_OPS).optional(),
    all: z.boolean().optional(),
  })
  .refine((d) => (d.jobIds && !d.all) || (!d.jobIds && d.all), {
    message: 'Informe `jobIds` OU `all: true` (exclusivos).',
  })

export async function POST(request: NextRequest) {
  const { user, response } = await requireSession()
  if (response) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Body JSON invalido')
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    const targets = parsed.data.all
      ? await prisma.imageJob.findMany({
          where: { status: 'DEAD_LETTER' },
          select: { id: true },
          take: MAX_OPS,
          orderBy: { updatedAt: 'asc' },
        })
      : await prisma.imageJob.findMany({
          where: { id: { in: parsed.data.jobIds ?? [] } },
          select: { id: true, status: true },
        })

    const processed: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const t of targets) {
      if ('status' in t && t.status !== 'DEAD_LETTER') {
        skipped.push({ id: t.id, reason: `status=${t.status}` })
        continue
      }
      try {
        await prisma.imageJob.update({
          where: { id: t.id },
          data: { status: 'PENDING', retryCount: 0, errorMessage: null },
        })
        await redis.rpush(REDIS_QUEUE_KEY, JSON.stringify({ jobId: t.id }))
        processed.push(t.id)
      } catch (err) {
        skipped.push({ id: t.id, reason: err instanceof Error ? err.message : 'update failed' })
      }
    }

    void auditLog({
      action: AUDIT_ACTIONS.IMAGE_JOB_DLQ_REPROCESS,
      entityType: 'ImageJob',
      entityId: 'bulk',
      userId: user.id,
      metadata: { processed: processed.length, skipped: skipped.length, all: !!parsed.data.all },
    })

    return ok({ processed: processed.length, skipped: skipped.length, details: { processed, skipped } })
  } catch {
    return internalError()
  }
}
