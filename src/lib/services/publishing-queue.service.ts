/**
 * PublishingQueueService — module-12-calendar-publishing
 * Gerencia fila de publicação com agendamento, cancelamento e listagem do dia.
 * INT-065 | INT-066 | INT-070 | FEAT-publishing-blog-001
 */
import { prisma } from '@/lib/prisma'
import { redis, QUEUE_KEYS } from '@/lib/redis'
import { ContentStatus, QueueStatus } from '@/types/enums'

// TODO (pós-MVP — CL-135): Implementar publicação automática para LinkedIn e Instagram
// sem necessidade de aprovação manual do operador. O fluxo atual exige approvedAt preenchido
// antes de agendar (INT-070). No pós-MVP, posts aprovados automaticamente pelo score de
// qualidade devem ser elegíveis para publicação direta via PublishingQueue.
// Ver INTAKE.md seção "Auto-publish pós-MVP" para regras de negócio completas.

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
   * CL-051: se publishing worker disponível, enfileira no Redis; caso contrário, retorna inline.
   */
  static async listDueToday() {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const duePosts = await prisma.publishingQueue.findMany({
      where: {
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: QueueStatus.PENDING,
      },
      include: { post: true },
      orderBy: { scheduledAt: 'asc' },
    })

    // Graceful degradation: enfileira no Redis se publishing worker habilitado
    if (process.env.ENABLE_PUBLISHING_WORKER === 'true' && duePosts.length > 0) {
      try {
        for (const queued of duePosts) {
          await redis.lpush(QUEUE_KEYS.publishing, JSON.stringify({ postId: queued.postId, channel: queued.post.channel }))
        }
      } catch {
        // Fallback silencioso — worker processa pelo polling direto ao DB
      }
    }

    return duePosts
  }

  /**
   * Retorna post para a fila com backoff exponencial.
   * Incrementa attempts.
   */
  static async returnToQueue(
    postId: string,
    errorMessage: string,
    context?: {
      channel?: string
      statusCode?: number
      requestPayload?: unknown
      responseBody?: unknown
    }
  ) {
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

    // TASK-5/ST001 (CL-198): grava snapshot da falha com payload sanitizado.
    try {
      const { sanitizeForLog } = await import('@/lib/log-sanitizer')
      await prisma.postPublishError.create({
        data: {
          postId,
          channel: context?.channel ?? queue.channel ?? 'unknown',
          statusCode: context?.statusCode,
          apiMessage: errorMessage,
          requestPayload: context?.requestPayload
            ? (sanitizeForLog(context.requestPayload) as object)
            : undefined,
          responseBody: context?.responseBody
            ? (sanitizeForLog(context.responseBody) as object)
            : undefined,
        },
      })
    } catch {
      /* nao bloqueia retry em caso de falha de log */
    }
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

  /**
   * TASK-5 ST001: Processa fila de publicações agendadas (CL-052).
   * Busca posts com scheduledAt <= now e status SCHEDULED.
   * Invocado pelo Vercel Cron a cada 5 minutos.
   */
  static async processQueue(): Promise<{ processed: number; failed: number; skipped: number }> {
    const now = new Date()

    const dueItems = await prisma.publishingQueue.findMany({
      where: {
        scheduledAt: { lte: now },
        status: QueueStatus.PENDING,
      },
      include: {
        post: { select: { id: true, channel: true, status: true, approvedAt: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20, // processar em lotes de 20
    })

    let processed = 0
    let failed = 0
    let skipped = 0

    // TASK-12 ST002 (G-002): kill-switch INSTAGRAM_PUBLISHING_LIVE.
    // Avalia 1x por batch para minimizar chamadas ao PostHog. Se desligado,
    // items Instagram permanecem PENDING com lastError sem consumir attempts.
    const { isFeatureEnabled, FeatureFlags } = await import('@/lib/feature-flags')
    const { logPublishAttempt } = await import('@/lib/audit/publish-audit')
    const instagramLive = await isFeatureEnabled(FeatureFlags.INSTAGRAM_PUBLISHING_LIVE)

    for (const item of dueItems) {
      // Skip Instagram items quando kill-switch ativo. Mantem status PENDING +
      // agenda nextAttemptAt = now + 5min para permitir retomada quando flag voltar.
      const channelLower = String(item.post.channel ?? '').toLowerCase()
      if (!instagramLive && channelLower === 'instagram') {
        await prisma.publishingQueue.update({
          where: { postId: item.postId },
          data: {
            lastError: 'kill_switch_on (INSTAGRAM_PUBLISHING_LIVE=false)',
            nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
            updatedAt: new Date(),
          },
        }).catch(() => {})
        await logPublishAttempt({
          postId: item.postId,
          action: 'publish_blocked_kill_switch',
          result: 'failure',
          errorMessage: 'kill_switch_on',
        }).catch(() => {})
        skipped++
        continue
      }

      // Marcar como PROCESSING
      await prisma.publishingQueue.update({
        where: { postId: item.postId },
        data: { status: QueueStatus.PROCESSING, updatedAt: new Date() },
      }).catch(() => {})

      try {
        // Enfileirar no Redis para o worker de publicação
        await redis.lpush(
          QUEUE_KEYS.publishing,
          JSON.stringify({ postId: item.postId, channel: item.post.channel })
        )

        // Atualizar status do Post para SCHEDULED → aguarda publicação pelo worker
        await prisma.post.update({
          where: { id: item.postId },
          data: { status: ContentStatus.SCHEDULED },
        })

        // RS-3: queue permanece PROCESSING ate o worker confirmar publish.
        // Antes: status=DONE era setado aqui (no enfileiramento), criando
        // ambiguidade entre "claim no Redis" vs "publicacao real concluida".
        // Agora: PROCESSING -> DONE so apos o worker chamar a Graph API
        // com sucesso. Falha do worker transiciona para FAILED via handleFailure.

        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        await PublishingQueueService.returnToQueue(item.postId, msg).catch(() => {})
        failed++
      }
    }

    console.info(
      `[PublishingQueue] processQueue | processed=${processed} failed=${failed} skipped=${skipped}`
    )

    return { processed, failed, skipped }
  }
}
