import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis, QUEUE_KEYS } from '@/lib/redis'
import { requireSession, ok, notFound, validationError, internalError } from '@/lib/api-auth'
import { GenerateImageSchema } from '@/schemas/image.schema'
import { IMAGE_DAILY_LIMIT } from '@/lib/constants/image-worker'
import { CONTENT_STATUS, IMAGE_JOB_STATUS } from '@/constants/status'

// POST /api/v1/images/generate
export async function POST(request: NextRequest) {
  const { response } = await requireSession()
  if (response) return response

  let body: unknown
  try { body = await request.json() } catch { return validationError(new Error('Body inválido')) }

  const parsed = GenerateImageSchema.safeParse(body)
  if (!parsed.success) return validationError(parsed.error)

  try {
    // Verificar limite diário — IMAGE_051 (sistema single-tenant: limite global)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyCount = await prisma.imageJob.count({
      where: { createdAt: { gte: today } },
    })
    if (dailyCount >= IMAGE_DAILY_LIMIT) {
      return NextResponse.json(
        { code: 'IMAGE_051', message: 'Limite de gerações atingido para hoje.' },
        { status: 429 }
      )
    }

    const piece = await prisma.contentPiece.findUnique({ where: { id: parsed.data.contentPieceId } })
    if (!piece) return notFound('Peça de conteúdo não encontrada')

    if (piece.status !== CONTENT_STATUS.APPROVED) {
      return NextResponse.json(
        { success: false, error: 'Peça de conteúdo não está aprovada para geração de imagem' },
        { status: 422 }
      )
    }

    // Criar ImageJob
    const job = await prisma.imageJob.create({
      data: {
        contentPieceId: parsed.data.contentPieceId,
        templateType: parsed.data.templateType,
        status: IMAGE_JOB_STATUS.PENDING,
      },
    })

    // Atualizar ContentPiece com imageJobId e status PENDING_ART
    await prisma.contentPiece.update({
      where: { id: parsed.data.contentPieceId },
      data: { imageJobId: job.id, status: CONTENT_STATUS.PENDING_ART },
    })

    // Enfileirar no Redis (CX-06: usa queue key fixa do contrato)
    await redis.lpush(QUEUE_KEYS.image, JSON.stringify({ jobId: job.id, templateType: parsed.data.templateType }))

    return ok({ jobId: job.id, status: IMAGE_JOB_STATUS.PENDING }, 202)
  } catch {
    return internalError()
  }
}
