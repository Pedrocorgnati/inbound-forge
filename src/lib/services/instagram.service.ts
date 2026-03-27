/**
 * Instagram Service — module-12-calendar-publishing
 * Pipeline completo de publicação via Graph API.
 * INT-021 | INT-070 | INT-119 | FEAT-publishing-blog-001
 */
import { prisma } from '@/lib/prisma'
import { ContentStatus, QueueStatus } from '@/types/enums'
import { getInstagramConfig } from '@/lib/instagram-client'
import { createInstagramClient } from '@/lib/instagram/instagram-client'
import { checkRateLimits, incrementPostCount } from '@/lib/instagram/rate-limiter'
import { getValidToken, getTokenStatus } from '@/lib/instagram/token-manager'
import { handlePublishFailure } from '@/lib/instagram/queue-manager'
import { logPublishAttempt } from '@/lib/audit/publish-audit'

export class InstagramService {
  /**
   * Pipeline completo de publicação no Instagram.
   * Requer post aprovado (INT-070) e rate limits OK.
   */
  static async publishPost(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { publishingQueue: true },
    })

    if (!post) throw new Error('Post não encontrado')

    // INT-070: aprovação humana obrigatória
    if (!post.approvedAt) {
      throw Object.assign(new Error('Post deve ser aprovado antes de publicar'), {
        code: 'POST_050',
      })
    }

    // SYS_004: imagem obrigatória (URL pública no Supabase Storage)
    if (!post.imageUrl || post.imageUrl.startsWith('data:') || post.imageUrl.includes('localhost')) {
      const err = Object.assign(
        new Error('Imagem sem URL pública. Use Supabase Storage.'),
        { code: 'SYS_004' }
      )
      const attempts = post.publishingQueue?.attempts ?? 0
      await handlePublishFailure(postId, err, attempts)
      throw err
    }

    // SYS_002: verificar rate limits
    const rateLimitStatus = await checkRateLimits()
    if (!rateLimitStatus.canPublish) {
      throw Object.assign(new Error(rateLimitStatus.reason ?? 'Rate limit atingido'), {
        code: 'SYS_002',
      })
    }

    // SYS_003: obter token válido (com refresh automático se necessário)
    const token = await getValidToken()
    const config = getInstagramConfig()
    if (!config) {
      throw Object.assign(new Error('Instagram não configurado'), { code: 'SYS_003' })
    }

    // Log de tentativa
    const attempts = (post.publishingQueue?.attempts ?? 0) + 1
    await logPublishAttempt({
      postId,
      action: 'publish_attempt',
      result: 'success', // atualizar abaixo conforme resultado
      attempts,
    })

    try {
      // Publicar via Graph API
      const client = createInstagramClient(token, config.businessAccountId)
      const result = await client.publishPost(post.imageUrl, post.caption)

      // Atualizar banco: sucesso
      await prisma.$transaction([
        prisma.post.update({
          where: { id: postId },
          data: {
            status: ContentStatus.PUBLISHED,
            publishedAt: result.publishedAt,
            platformPostId: result.platformPostId,
            platform: 'instagram_graph_api',
          },
        }),
        ...(post.publishingQueue
          ? [
              prisma.publishingQueue.update({
                where: { postId },
                data: { status: QueueStatus.DONE, updatedAt: new Date() },
              }),
            ]
          : []),
      ])

      // Incrementar contador de posts publicados no dia
      await incrementPostCount()

      // Audit log: sucesso
      await logPublishAttempt({
        postId,
        action: 'publish_success',
        result: 'success',
        platformPostId: result.platformPostId,
        attempts,
      })

      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      // Fallback para fila com backoff
      await handlePublishFailure(postId, err, post.publishingQueue?.attempts ?? 0)

      // Audit log: falha
      await logPublishAttempt({
        postId,
        action: 'publish_failure',
        result: 'failure',
        errorMessage: err.message,
        attempts,
      })

      throw err
    }
  }

  /**
   * Status da conta Instagram + token + rate limits.
   */
  static async getStatus() {
    const config = getInstagramConfig()
    if (!config) {
      return {
        configured: false,
        accountOk: false,
        tokenExpiry: null,
        rateLimitRemaining: 0,
        postsToday: 0,
      }
    }

    const [tokenStatus, { requestsThisHour, postsToday }] = await Promise.all([
      getTokenStatus(),
      import('@/lib/instagram/rate-limiter').then(m => m.getRateLimitStatus()),
    ])

    return {
      configured: true,
      accountOk: !tokenStatus.isExpired,
      tokenExpiry: tokenStatus,
      rateLimitRemaining: Math.max(0, 200 - requestsThisHour),
      postsToday,
      warning: tokenStatus.warningMessage,
    }
  }
}
