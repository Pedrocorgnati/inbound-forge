import { prisma } from '@/lib/prisma'
import { redis as _redis, QUEUE_KEYS as _QUEUE_KEYS } from '@/lib/redis'
import type { GenerateImageInput } from '@/schemas/image.schema'

export class ImageService {
  async enqueueGeneration(_input: GenerateImageInput) {
    // TODO: Implementar via /auto-flow execute
    // 1. Verificar que ContentPiece está APPROVED
    // 2. Criar ImageJob com status PENDING
    // 3. Enfileirar no Redis: image:{jobId}
    // 4. Atualizar ContentPiece status para PENDING_ART
    throw new Error('Not implemented — run /auto-flow execute')
  }

  async getJobStatus(jobId: string) {
    return prisma.imageJob.findUnique({ where: { id: jobId } })
  }

  async listAssets(page: number, limit: number) {
    const [data, total] = await Promise.all([
      prisma.visualAsset.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.visualAsset.count(),
    ])
    return { data, total }
  }
}

export const imageService = new ImageService()
