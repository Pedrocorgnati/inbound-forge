// module-9: Consumer Loop — lpop polling + graceful shutdown
// Rastreabilidade: TASK-1 ST002, INT-057, INT-058, CX-06, FEAT-creative-generation-002
//
// Upstash REST API não suporta BLPOP — usa lpop com polling a cada 3s.

import type { Redis }       from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'

import { IMAGE_WORKER_CONFIG, REDIS_QUEUE_KEY } from './constants'
import { handleRetry }  from './retry'
import { generateImage } from './generate'
import type { WorkerEnv } from './env'
import type { TemplateType } from './types'
import type { TemplateBaseProps } from './templates/types'

interface QueueMessage {
  jobId: string
}

let isShuttingDown = false

export function registerSigtermHandler(): void {
  process.on('SIGTERM', () => {
    log({ event: 'sigterm_received', timestamp: new Date().toISOString() })
    isShuttingDown = true
  })
}

export async function startConsumerLoop(
  redis: Redis,
  db:    PrismaClient,
  env:   WorkerEnv
): Promise<void> {
  registerSigtermHandler()

  while (!isShuttingDown) {
    let raw: string | null = null

    try {
      raw = await redis.lpop<string>(REDIS_QUEUE_KEY)
    } catch (err) {
      log({ event: 'redis_lpop_error', error: String(err), timestamp: new Date().toISOString() })
      await sleep(IMAGE_WORKER_CONFIG.pollingIntervalMs)
      continue
    }

    if (!raw) {
      await sleep(IMAGE_WORKER_CONFIG.pollingIntervalMs)
      continue
    }

    let jobId: string

    try {
      const msg = JSON.parse(raw) as QueueMessage
      jobId = msg.jobId
    } catch {
      log({ event: 'queue_parse_error', raw, timestamp: new Date().toISOString() })
      continue
    }

    await processJob(jobId, db, env)
  }

  log({ event: 'consumer_loop_stopped', timestamp: new Date().toISOString() })
  process.exit(0)
}

async function processJob(
  jobId: string,
  db:    PrismaClient,
  env:   WorkerEnv
): Promise<void> {
  const job = await db.imageJob.findUnique({
    where:   { id: jobId },
    include: { template: true },
  })

  if (!job) {
    log({ event: 'job_not_found', jobId, code: 'IMAGE_080', timestamp: new Date().toISOString() })
    return
  }

  await db.imageJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } })
  log({ event: 'job_processing', jobId, timestamp: new Date().toISOString() })

  const abortController = new AbortController()
  const timeoutMs = env.IMAGE_WORKER_TIMEOUT_MS
  const timeout   = setTimeout(() => {
    log({ event: 'job_timeout_imminent', jobId, timeoutMs, timestamp: new Date().toISOString() })
    abortController.abort()
  }, timeoutMs)

  // Derive templateType + templateProps from job/template records
  const templateType = (job.template?.templateType ?? 'CAROUSEL') as TemplateType
  const metadata     = (job.metadata ?? {}) as Record<string, unknown>
  const templateProps: TemplateBaseProps & Record<string, unknown> = {
    headline:   (metadata.headline   as string | undefined) ?? 'Content',
    subheadline:(metadata.subheadline as string | undefined),
    brandColor: (metadata.brandColor  as string | undefined),
    ...metadata,
  }

  try {
    const imageUrl = await generateImage(
      {
        jobId,
        templateType,
        templateProps,
        prompt:          job.prompt ?? templateProps.headline as string,
        contentPieceId:  job.contentPieceId,
        format:          'webp',
      },
      db,
      env,
      abortController.signal
    )

    clearTimeout(timeout)
    await db.imageJob.update({
      where: { id: jobId },
      data:  { status: 'DONE', imageUrl, completedAt: new Date() },
    })
    log({ event: 'job_done', jobId, imageUrl, timestamp: new Date().toISOString() })
  } catch (err) {
    clearTimeout(timeout)
    log({ event: 'job_failed', jobId, error: String(err), timestamp: new Date().toISOString() })
    await handleRetry(jobId, err, db)
  }
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
