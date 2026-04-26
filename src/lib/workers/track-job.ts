/**
 * TASK-4 ST002 (CL-TH-010): helper para envolver execucao de um job da fila com
 * registro de lifecycle em WorkerJob (PENDING -> RUNNING -> COMPLETED|FAILED).
 *
 * Apos N retries (WORKER_MAX_RETRIES, default 3) o job e movido para DEAD_LETTER.
 *
 * Uso:
 *   await trackJob(
 *     { type: 'image.generate', payload: { pieceId: '...' } },
 *     async () => { ... logica real ... }
 *   )
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const DEFAULT_MAX_RETRIES = Number(process.env.WORKER_MAX_RETRIES ?? '3')
const ERROR_TRUNCATE_CHARS = 2000

export interface TrackJobInput {
  type: string
  payload?: Prisma.InputJsonValue
  /** Quando fornecido, marca como retry do job informado (incrementa retryCount). */
  retryOf?: string
  maxRetries?: number
}

export async function trackJob<T>(
  input: TrackJobInput,
  fn: () => Promise<T>,
): Promise<{ job: { id: string }; result: T }> {
  const maxRetries = input.maxRetries ?? DEFAULT_MAX_RETRIES

  let previousRetryCount = 0
  if (input.retryOf) {
    const prev = await prisma.workerJob.findUnique({
      where: { id: input.retryOf },
      select: { retryCount: true },
    })
    previousRetryCount = (prev?.retryCount ?? 0) + 1
  }

  const job = await prisma.workerJob.create({
    data: {
      type: input.type,
      status: 'PENDING',
      retryCount: previousRetryCount,
      payload: input.payload,
    },
    select: { id: true },
  })

  await prisma.workerJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  try {
    const result = await fn()
    await prisma.workerJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })
    return { job, result }
  } catch (err) {
    const message =
      err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    const truncated = message.slice(0, ERROR_TRUNCATE_CHARS)
    const finalStatus =
      previousRetryCount >= maxRetries ? 'DEAD_LETTER' : 'FAILED'
    await prisma.workerJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        error: truncated,
        completedAt: new Date(),
      },
    })
    throw err
  }
}

export async function requeueDeadLetter(jobId: string): Promise<{ id: string } | null> {
  const job = await prisma.workerJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, type: true, payload: true },
  })
  if (!job || job.status !== 'DEAD_LETTER') return null

  await prisma.workerJob.update({
    where: { id: jobId },
    data: {
      status: 'PENDING',
      retryCount: 0,
      error: null,
      startedAt: null,
      completedAt: null,
    },
  })
  return { id: job.id }
}
