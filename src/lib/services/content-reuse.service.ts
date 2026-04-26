/**
 * ContentReuseService — TASK-2/ST003 (gap CL-135).
 * Permite re-enfileirar um Post ja gerado (caption, imageUrl, etc) sem chamar
 * Claude novamente, quando a falha foi de publicacao (rate limit, rede, auth).
 */
import { prisma } from '@/lib/prisma'
import { CONTENT_STATUS } from '@/constants/status'

export interface RepublishResult {
  postId: string
  status: string
  reused: true
  reason?: string
  queueId?: string
}

export async function republishWithReuse(postId: string, operatorId?: string): Promise<RepublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      caption: true,
      imageUrl: true,
      channel: true,
      publishingQueue: true,
    },
  })
  if (!post) throw new Error(`Post ${postId} nao encontrado`)

  if (!post.caption) {
    throw new Error('Post sem conteudo gerado — nao e possivel reutilizar')
  }

  // Re-enfileira usando o conteudo ja existente — sem chamada ao Claude.
  const queueId = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: {
        status: CONTENT_STATUS.APPROVED,
        errorMessage: null,
      },
    })
    const upserted = await tx.publishingQueue.upsert({
      where: { postId },
      update: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        nextAttemptAt: new Date(),
      },
      create: {
        postId,
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    })
    return upserted.id
  })

  // Telemetria: content_reuse_count
  await prisma.alertLog
    .create({
      data: {
        severity: 'INFO',
        type: 'CONTENT_REUSED',
        message: `Post ${postId} re-enfileirado com conteudo existente (sem chamar Claude) [postId=${postId} operatorId=${operatorId} queueId=${queueId}]`,
      },
    })
    .catch(() => undefined)

  return { postId, status: 'QUEUED', reused: true, queueId }
}
