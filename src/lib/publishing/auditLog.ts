/**
 * PublishAuditLog helper — Intake-Review TASK-1 ST006
 * Grava delta auditavel em PublishAuditLog para operacoes cancel/edit/duplicate.
 * Fire-and-forget: falha em auditoria NUNCA bloqueia a operacao principal.
 */
import { prisma } from '@/lib/prisma'
export { computeDelta } from './delta'

export type PublishAuditAction = 'cancel' | 'edit' | 'duplicate' | 'reschedule'

export interface WritePublishAuditInput {
  postId: string
  operatorId: string
  action: PublishAuditAction
  delta: Record<string, unknown>
}

export async function writePublishAudit(input: WritePublishAuditInput): Promise<void> {
  try {
    await prisma.publishAuditLog.create({
      data: {
        postId: input.postId,
        operatorId: input.operatorId,
        action: input.action,
        result: 'success',
        delta: JSON.parse(JSON.stringify(input.delta)),
      },
    })
  } catch (err) {
    console.error('[publish-audit] write failed:', err instanceof Error ? err.message : 'unknown')
  }
}

