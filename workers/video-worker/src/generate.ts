// Video Worker: Generate — Orchestrator
// Pipeline: createShortVideo → poll status → download MP4 → upload to Supabase

import type { PrismaClient } from '@prisma/client'
import type { VideoWorkerEnv } from './env'
import { VIDEO_WORKER_CONFIG, VIDEO_DEFAULT_CONFIG } from './constants'
import { uploadVideoToStorage } from './storage'

interface VideoScene {
  text: string
  searchTerms: string[]
}

interface VideoConfig {
  paddingBack?: number
  music?: boolean
  captionPosition?: string
  captionBackgroundColor?: string
  voice?: string
  orientation?: string
  musicVolume?: number
}

interface GenerateVideoParams {
  jobId: string
  scenes: VideoScene[]
  config?: VideoConfig
}

export async function generateVideo(
  params: GenerateVideoParams,
  db: PrismaClient,
  env: VideoWorkerEnv,
  signal?: AbortSignal
): Promise<string> {
  const { jobId, scenes, config } = params
  const baseUrl = env.SHORT_VIDEO_MAKER_URL
  const startTs = Date.now()

  // 1. Criar vídeo no Short Video Maker
  const mergedConfig = { ...VIDEO_DEFAULT_CONFIG, ...config }

  const createResponse = await fetch(`${baseUrl}/api/short-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenes, config: mergedConfig }),
    signal,
  })

  if (!createResponse.ok) {
    const text = await createResponse.text().catch(() => '')
    throw new Error(`Short Video Maker create error ${createResponse.status}: ${text}`)
  }

  const { videoId: externalVideoId } = await createResponse.json() as { videoId: string }

  // Gravar externalVideoId no job
  await db.videoJob.update({
    where: { id: jobId },
    data: { externalVideoId },
  })

  log({ event: 'video_created', jobId, externalVideoId, timestamp: new Date().toISOString() })

  // 2. Poll status até ready/failed
  const deadline = Date.now() + env.VIDEO_WORKER_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Video generation aborted')

    const statusRes = await fetch(`${baseUrl}/api/short-video/${externalVideoId}/status`, { signal })
    if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`)

    const statusData = await statusRes.json() as { status: string; error?: string }

    if (statusData.status === 'failed') {
      throw new Error(`Video generation failed: ${statusData.error ?? 'unknown'}`)
    }

    if (statusData.status === 'ready') {
      log({ event: 'video_ready', jobId, externalVideoId, timestamp: new Date().toISOString() })
      break
    }

    await new Promise((resolve) => setTimeout(resolve, VIDEO_WORKER_CONFIG.statusCheckMs))
  }

  if (Date.now() >= deadline) {
    throw new Error(`Video generation timeout após ${env.VIDEO_WORKER_TIMEOUT_MS}ms`)
  }

  // 3. Download MP4
  const downloadRes = await fetch(`${baseUrl}/api/short-video/${externalVideoId}`, { signal })
  if (!downloadRes.ok) throw new Error(`Video download failed: ${downloadRes.status}`)

  const arrayBuffer = await downloadRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  log({ event: 'video_downloaded', jobId, sizeBytes: buffer.length, timestamp: new Date().toISOString() })

  // 4. Upload to Supabase Storage
  const outputUrl = await uploadVideoToStorage(
    buffer,
    jobId,
    {
      SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_STORAGE_BUCKET: env.SUPABASE_STORAGE_BUCKET,
    },
    signal
  )

  const processingMs = Date.now() - startTs

  // 5. Atualizar job com resultado
  await db.videoJob.update({
    where: { id: jobId },
    data: {
      outputUrl,
      fileSizeBytes: buffer.length,
      processingMs,
    },
  })

  // 6. Registrar custo (infra-only, sem API cost)
  await db.costLog.create({
    data: {
      provider:   'short-video-maker',
      amount:     0,
      operation:  'video_generation',
      metadata:   JSON.stringify({ jobId, externalVideoId, sizeBytes: buffer.length, processingMs }),
    },
  }).catch(() => {}) // non-critical

  log({ event: 'video_uploaded', jobId, outputUrl, processingMs, timestamp: new Date().toISOString() })

  return outputUrl
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
