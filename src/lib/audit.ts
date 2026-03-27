/**
 * Audit Log — COMP-001
 * Registra ações de criação/modificação em audit_logs.
 * NUNCA incluir PII (contactInfo) no metadata — SEC-008
 */
import { prisma } from '@/lib/prisma'

export interface AuditLogInput {
  action: string        // e.g. "lead.created", "lead.contact_revealed", "conversion.created"
  entityType: string    // "Lead" | "ConversionEvent" | "UTMLink"
  entityId: string
  userId: string
  leadId?: string
  metadata?: Record<string, unknown>  // NEVER include contactInfo
}

/**
 * Persiste um registro de audit no banco.
 * Fire-and-forget — nunca bloqueia a operação principal.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        userId: input.userId,
        leadId: input.leadId ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      },
    })
  } catch (err) {
    // Audit log failure NUNCA bloqueia a operação principal
    console.error('[COMP-001] auditLog failed:', err instanceof Error ? err.message : 'unknown')
  }
}
