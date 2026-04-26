// Video Worker: Consumer Loop — lpop polling + graceful shutdown
// Follows image-worker pattern: Upstash REST API (no BLPOP)

import type { Redis }        from '@upstash/redis'
import type { PrismaClient } from '@prisma/client'

import { VIDEO_WORKER_CONFIG, REDIS_VIDEO_QUEUE_KEY } from './constants'
import { handleRetry }   from './retry'
import { generateVideo } from './generate'
import type { VideoWorkerEnv } from './env'

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
  env:   VideoWorkerEnv
): Promise<void> {
  registerSigtermHandler()

  while (!isShuttingDown) {
    let raw: string | null = null

    try {
      raw = await redis.lpop<string>(REDIS_VIDEO_QUEUE_KEY)
    } catch (err) {
      log({ event: 'redis_lpop_error', error: String(err), timestamp: new Date().toISOString() })
      await sleep(VIDEO_WORKER_CONFIG.pollingIntervalMs)
      continue
    }

    if (!raw) {
      await sleep(VIDEO_WORKER_CONFIG.pollingIntervalMs)
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
  env:   VideoWorkerEnv
): Promise<void> {
  const job = await db.videoJob.findUnique({ where: { id: jobId } })

  if (!job) {
    log({ event: 'job_not_found', jobId, code: 'VIDEO_080', timestamp: new Date().toISOString() })
    return
  }

  await db.videoJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } })
  log({ event: 'job_processing', jobId, timestamp: new Date().toISOString() })

  const abortController = new AbortController()
  const timeoutMs = env.VIDEO_WORKER_TIMEOUT_MS
  const timeout   = setTimeout(() => {
    log({ event: 'job_timeout_imminent', jobId, timeoutMs, timestamp: new Date().toISOString() })
    abortController.abort()
  }, timeoutMs)

  const scenes = (job.scenes as Array<{ text: string; searchTerms: string[] }>) ?? []
  const config = (job.config as Record<string, unknown>) ?? {}

  try {
    const outputUrl = await generateVideo(
      {
        jobId,
        scenes,
        config,
      },
      db,
      env,
      abortController.signal
    )

    clearTimeout(timeout)
    await db.videoJob.update({
      where: { id: jobId },
      data:  { status: 'DONE', outputUrl, completedAt: new Date() },
    })
    log({ event: 'job_done', jobId, outputUrl, timestamp: new Date().toISOString() })
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
