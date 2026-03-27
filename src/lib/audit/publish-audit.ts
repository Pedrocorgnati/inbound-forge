/**
 * Publish Audit — module-12-calendar-publishing
 * Registra todas as tentativas de publicação Instagram para rastreabilidade.
 * COMP-001 | INT-021
 */
import { prisma } from '@/lib/prisma'

export interface PublishAuditData {
  postId: string
  action: 'publish_attempt' | 'publish_success' | 'publish_failure' | 'queue_retry' | 'permanent_fail' | 'approve'
  result: 'success' | 'failure'
  platformPostId?: string
  errorMessage?: string
  attempts?: number
}

/**
 * Registra evento de publicação no audit log.
 * Falha silenciosamente (não deve bloquear o fluxo principal).
 */
export async function logPublishAttempt(data: PublishAuditData): Promise<void> {
  try {
    await prisma.publishAuditLog.create({
      data: {
        postId: data.postId,
        action: data.action,
        result: data.result,
        platformPostId: data.platformPostId,
        errorMessage: data.errorMessage,
        attempts: data.attempts ?? 1,
      },
    })
  } catch (error) {
    console.error('[publish-audit] Falha ao registrar audit log:', error)
    // Não relançar — audit log não deve bloquear publicação
  }
}
