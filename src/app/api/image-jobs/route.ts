/**
 * POST /api/image-jobs — Criar job de geração de imagem
 *
 * Módulo: module-9-image-worker (TASK-1/ST004, ST005)
 * Rastreabilidade: CX-05, INT-084, FEAT-creative-generation-004
 * Error Catalog: IMAGE_051 (409 — job duplicado), IMAGE_052 (503 — worker DOWN)
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireSession, ok, validationError } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis, QUEUE_KEYS } from '@/lib/redis'
import { IMAGE_JOB_STATUS } from '@/constants/status'
import { selectBackgroundProvider } from '@/lib/image-generation/backgroundRouter'

const CreateImageJobSchema = z.object({
  contentPieceId: z.string().uuid().optional(),
  templateId:     z.string().uuid().optional(),
  prompt:         z.string().min(1).max(2000),
  backgroundNeedsText: z.boolean().optional(),
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

  const parsed = CreateImageJobSchema.safeParse(body)
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((i) => i.message).join('; '))
  }

  const { contentPieceId, templateId, prompt, backgroundNeedsText } = parsed.data

  // Resolver needsText: input > template.backgroundNeedsText > false
  let needsText = backgroundNeedsText ?? false
  if (backgroundNeedsText === undefined && templateId) {
    const tpl = await prisma.imageTemplate.findUnique({
      where: { id: templateId },
      select: { backgroundNeedsText: true },
    })
    if (tpl) needsText = tpl.backgroundNeedsText
  }
  const backgroundProvider = selectBackgroundProvider({ needsText })

  // Verificar worker health — IMAGE_052
  const workerHealth = await prisma.workerHealth.findUnique({ where: { type: 'IMAGE' } })
  const isWorkerDown = !workerHealth || (() => {
    const sinceMs = Date.now() - workerHealth.lastHeartbeat.getTime()
    return sinceMs > 60_000 // sem heartbeat há > 60s
  })()

  if (isWorkerDown) {
    return NextResponse.json(
      { error: { code: 'IMAGE_052', message: 'Serviço de geração de imagens temporariamente indisponível.' } },
      { status: 503 }
    )
  }

  // Verificar job duplicado — IMAGE_051
  if (contentPieceId) {
    const existingJob = await prisma.imageJob.findFirst({
      where: {
        contentPieceId,
        status: { in: [IMAGE_JOB_STATUS.PENDING, IMAGE_JOB_STATUS.PROCESSING] },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        { error: { code: 'IMAGE_051', message: 'Já existe um job de geração de imagem em andamento para este conteúdo.' } },
        { status: 409 }
      )
    }
  }

  // Criar job
  const job = await prisma.imageJob.create({
    data: {
      contentPieceId: contentPieceId ?? null,
      templateId:     templateId ?? null,
      prompt,
      backgroundProvider,
      backgroundNeedsText: needsText,
      status:       IMAGE_JOB_STATUS.PENDING,
      retryCount:   0,
    },
  })

  // Enfileirar no Redis
  await redis.rpush(QUEUE_KEYS.image, JSON.stringify({ jobId: job.id, backgroundProvider }))

  return ok({ jobId: job.id }, 201)
}
