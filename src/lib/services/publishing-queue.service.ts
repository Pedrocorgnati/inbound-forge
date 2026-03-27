/**
 * PublishingQueueService — module-12-calendar-publishing
 * Gerencia fila de publicação com agendamento, cancelamento e listagem do dia.
 * INT-065 | INT-066 | INT-070 | FEAT-publishing-blog-001
 */
import { prisma } from '@/lib/prisma'
import { ContentStatus, QueueStatus } from '@/types/enums'

export class PublishingQueueService {
  /**
   * Agenda post para publicação.
   * INT-070: verifica approvedAt antes de agendar (403 se não aprovado).
   */
  static async schedule(postId: string, scheduledAt: Date) {
    const now = new Date()

    // Validação: data não pode ser no passado
    if (scheduledAt <= now) {
      throw new Error('Data de agendamento não pode ser no passado')
    }

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return null

    // INT-070: aprovação humana obrigatória
    if (!post.approvedAt) {
      const error = new Error('Post deve ser aprovado antes de agendar')
      ;(error as Error & { code: string }).code = 'POST_050'
      throw error
    }

    // Cria/atualiza entry na fila e atualiza Post.scheduledAt
    const [queue] = await prisma.$transaction([
      prisma.publishingQueue.upsert({
        where: { postId },
        create: {
          postId,
          channel: post.channel.toString(),
          scheduledAt,
          status: QueueStatus.PENDING,
          priority: 0,
          maxAttempts: 3,
        },
        update: {
          scheduledAt,
          status: QueueStatus.PENDING,
          updatedAt: now,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { scheduledAt, status: ContentStatus.SCHEDULED },
      }),
    ])

    return queue
  }

  /**
   * Remove post da fila (cancela agendamento).
   */
  static async unschedule(postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return null

    await prisma.$transaction([
      prisma.publishingQueue.deleteMany({ where: { postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { scheduledAt: null, status: ContentStatus.APPROVED },
      }),
    ])

    return { success: true }
  }

  /**
   * Lista posts com publicação programada para hoje (dashboard "Publicar Hoje").
   */
  static async listDueToday() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    return prisma.publishingQueue.findMany({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: QueueStatus.PENDING,
      },
      include: { post: true },
      orderBy: { scheduledAt: 'asc' },
    })
  }

  /**
   * Retorna post para a fila com backoff exponencial.
   * Incrementa attempts.
   */
  static async returnToQueue(postId: string, errorMessage: string) {
    const queue = await prisma.publishingQueue.findUnique({ where: { postId } })
    if (!queue) return

    const newAttempts = (queue.attempts ?? 0) + 1
    const backoffMinutes = 10 * newAttempts
    const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    await prisma.publishingQueue.update({
      where: { postId },
      data: {
        attempts: newAttempts,
        lastError: errorMessage,
        scheduledAt: nextAttemptAt,
        nextAttemptAt,
        status: QueueStatus.PENDING,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Marca post como permanentemente falhado após esgotamento de tentativas.
   */
  static async markPermanentlyFailed(postId: string, errorMessage: string) {
    await prisma.$transaction([
      prisma.publishingQueue.update({
        where: { postId },
        data: { status: QueueStatus.FAILED, lastError: errorMessage, updatedAt: new Date() },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { status: ContentStatus.FAILED, errorMessage },
      }),
    ])
  }
}
