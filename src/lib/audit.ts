/**
 * Audit Log — COMP-001
 * Registra ações de criação/modificação em audit_logs.
 * NUNCA incluir PII (contactInfo) no metadata — SEC-008
 */
import { prisma } from '@/lib/prisma'

/**
 * Catalogo canonico de acoes auditadas.
 * Novos tipos devem ser adicionados aqui para evitar drift de strings
 * mais referenciado em runbooks de conformidade (LGPD, SOC2).
 *
 * Intake-Review TASK-1 ST004 (CL-TA-036): adicionado LGPD_PURGE.
 * Intake-Review TASK-2 ST002 (CL-CG-012):  adicionado ASSET_UPLOAD.
 */
export const AUDIT_ACTIONS = {
  LGPD_PURGE:          'lgpd.purge',
  ASSET_UPLOAD:        'asset.upload',
  ASSET_DELETE:        'asset.delete',
  // Intake-Review TASK-4 ST005 (CL-TH-059): requeue manual de DLQ
  WORKER_JOB_REQUEUE:  'worker_job.requeue',
  // Intake-Review TASK-5 ST002 (CL-AU-016): export LGPD portabilidade
  USER_DATA_EXPORT:    'user.data_export',
  // Intake-Review TASK-6 ST001/ST002 (CL-AU-017/018): alteracao self-service
  PASSWORD_CHANGED:    'auth.password_changed',
  EMAIL_CHANGE_REQUESTED: 'auth.email_change_requested',
  // Intake-Review TASK-8 ST001 (CL-TH-018): export CSV de Themes
  THEMES_EXPORT:       'themes.export',
  // Intake-Review TASK-12 (CL-CG-008/009/011/038): DLQ ops
  IMAGE_JOB_RETRY:        'image_job.retry',
  IMAGE_JOB_CANCEL:       'image_job.cancel',
  IMAGE_JOB_DLQ_REPROCESS: 'image_job.dlq_reprocess',
  // Intake-Review TASK-22: export CSV das 5 entidades restantes
  CONTENT_EXPORT:      'content.export',
  POSTS_EXPORT:        'posts.export',
  CONVERSIONS_EXPORT:  'conversions.export',
  USERS_EXPORT:        'users.export',
  AUDIT_LOGS_EXPORT:   'audit_logs.export',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string

export interface AuditLogInput {
  action: AuditAction   // e.g. "lead.created", "lgpd.purge", "asset.upload"
  entityType: string    // "Lead" | "ConversionEvent" | "UTMLink" | "VisualAsset"
  entityId: string
  userId: string
  leadId?: string
  metadata?: Record<string, unknown>  // NEVER include contactInfo
  /**
   * PA-03: quando true, falha de audit propaga exceção para o caller
   * em vez de engolir silenciosamente. Usar APENAS em operações onde
   * o audit pode rodar ANTES ou DENTRO de uma transação (lgpd.purge,
   * user.data_export). Ações pós-mutação (lead.created, lead.deleted)
   * devem permanecer fire-and-forget para não gerar estado inconsistente.
   */
  critical?: boolean
}

/**
 * Ações que obrigam audit log com `critical: true`.
 * ATENÇÃO: incluir aqui apenas ações cuja falha de audit ocorre ANTES
 * da mutação principal (ex: dentro de uma transação). Ações pós-mutação
 * (lead.created, lead.deleted) devem permanecer fire-and-forget para evitar
 * que falha de audit reverta operação já confirmada ao usuário.
 */
const CRITICAL_ACTIONS: ReadonlySet<string> = new Set([
  'lgpd.purge',
  'user.data_export',
])

/**
 * Persiste um registro de audit no banco.
 * Fire-and-forget por padrão. Com `critical: true` (ou ação crítica),
 * re-lança exceção para que a API possa retornar 500 em vez de silenciar.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  const isCritical = input.critical === true || CRITICAL_ACTIONS.has(input.action)
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
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error(`[COMP-001] auditLog failed (critical=${isCritical}):`, msg)
    if (isCritical) {
      throw new Error(`Audit log falhou para ação crítica "${input.action}": ${msg}`)
    }
  }
}
