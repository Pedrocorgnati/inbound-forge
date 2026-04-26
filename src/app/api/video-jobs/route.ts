/**
 * POST /api/video-jobs — Criar job de geração de vídeo curto
 * GET  /api/video-jobs — Listar jobs de vídeo
 *
 * Integração: Short Video Maker MCP (gyoridavid/short-video-maker)
 * Rastreabilidade: integração video-worker, canais TIKTOK/YOUTUBE_SHORTS/INSTAGRAM
 * Error Catalog: VIDEO_051 (409 — job duplicado), VIDEO_052 (503 — worker DOWN)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError } from '@/lib/api-auth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redis, QUEUE_KEYS } from '@/lib/redis'
import { VIDEO_JOB_STATUS } from '@/constants/status'

const SceneSchema = z.object({
  text: z.string().min(1).max(500),
  searchTerms: z.array(z.string().min(1)).min(1).max(5),
})

const CreateVideoJobSchema = z.object({
  contentPieceId: z.string().uuid().optional(),
  orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT'),
  scenes: z.array(SceneSchema).min(1).max(20),
  config: z.object({
    paddingBack: z.number().int().min(0).max(5000).optional(),
    music: z.boolean().optional(),
    captionPosition: z.enum(['top', 'bottom']).optional(),
    captionBackgroundColor: z.string().optional(),
    voice: z.string().optional(),
    musicVolume: z.number().min(0).max(1).optional(),
  }).optional(),
  prompt: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return validationError('Body JSON inválido')
  }

  const parsed = CreateVideoJobSchema.safeParse(body)
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join('; '))
  }

  const { contentPieceId, orientation, scenes, config, prompt } = parsed.data

  // Verificar worker health — VIDEO_052
  const workerHealth = await prisma.workerHealth.findUnique({ where: { type: 'VIDEO' } })
  const isWorkerDown = !workerHealth || (() => {
    const sinceMs = Date.now() - workerHealth.lastHeartbeat.getTime()
    return sinceMs > 60_000
  })()

  if (isWorkerDown) {
    return NextResponse.json(
      { error: { code: 'VIDEO_052', message: 'Serviço de geração de vídeos temporariamente indisponível.' } },
      { status: 503 }
    )
  }

  // Verificar job duplicado — VIDEO_051
  if (contentPieceId) {
    const piece = await prisma.contentPiece.findUnique({
      where: { id: contentPieceId },
      include: { videoJob: true },
    })

    if (piece?.videoJob && [VIDEO_JOB_STATUS.PENDING, VIDEO_JOB_STATUS.PROCESSING].includes(piece.videoJob.status as never)) {
      return NextResponse.json(
        { error: { code: 'VIDEO_051', message: 'Já existe um job de geração de vídeo em andamento para este conteúdo.' } },
        { status: 409 }
      )
    }
  }

  const job = await prisma.videoJob.create({
    data: {
      orientation,
      scenes,
      config: config ?? Prisma.JsonNull,
      prompt: prompt ?? null,
      status: VIDEO_JOB_STATUS.PENDING,
      retryCount: 0,
    },
  })

  // Link ContentPiece → VideoJob
  if (contentPieceId) {
    await prisma.contentPiece.update({
      where: { id: contentPieceId },
      data: { videoJobId: job.id },
    })
  }

  await redis.rpush(QUEUE_KEYS.video, JSON.stringify({ jobId: job.id }))

  return ok({ jobId: job.id }, 201)
}

export async function GET(request: NextRequest) {
  const { response: authResponse } = await requireSession()
  if (authResponse) return authResponse

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const where = status ? { status } : {}

  const [jobs, total] = await Promise.all([
    prisma.videoJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.videoJob.count({ where }),
  ])

  return ok({ jobs, total, limit, offset })
}
