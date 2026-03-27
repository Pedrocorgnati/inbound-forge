import { prisma } from '@/lib/prisma'
import { maskPII } from '@/lib/utils/pii'

interface AuditEntry {
  action: string           // ex: 'content.approve', 'lead.create'
  entityType: string       // ex: 'ContentPiece', 'Lead'
  entityId: string
  operatorId: string
  metadata?: Record<string, unknown>
  // NUNCA incluir campos com PII raw
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const sanitizedMetadata = entry.metadata
    ? sanitizeForAudit(entry.metadata)
    : undefined

  // Usando AlertLog como backing store de audit (type: 'AUDIT', severity: 'INFO')
  // Dados sanitizados serializados no campo message como JSON
  const message = JSON.stringify({
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    operatorId: entry.operatorId,
    metadata: sanitizedMetadata ?? {},
  })

  await prisma.alertLog.create({
    data: {
      type: 'AUDIT',
      severity: 'INFO',
      message,
      resolved: true, // registros de audit são imediatamente "resolved"
    },
  })
}

const PII_FIELDS = ['email', 'phone', 'contactInfo', 'name', 'cpf']

function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (PII_FIELDS.includes(key) && typeof value === 'string') {
        return [key, maskPII(value)]
      }
      return [key, value]
    })
  )
}
