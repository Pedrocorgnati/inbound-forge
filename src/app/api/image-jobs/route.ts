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

const CreateImageJobSchema = z.object({
  contentPieceId: z.string().uuid().optional(),
  templateId:     z.string().uuid().optional(),
  prompt:         z.string().min(1).max(2000),
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

  const { contentPieceId, templateId, prompt } = parsed.data

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
        status: { in: ['PENDING', 'PROCESSING'] },
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
      status:       'PENDING',
      retryCount:   0,
    },
  })

  // Enfileirar no Redis
  await redis.rpush(QUEUE_KEYS.image, JSON.stringify({ jobId: job.id }))

  return ok({ jobId: job.id }, 201)
}
