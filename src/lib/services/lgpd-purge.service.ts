/**
 * Intake-Review TASK-1 (CL-TA-036, CL-OP-018, CL-TH-031): purga LGPD
 * consolidada — deleta Leads com createdAt < now() - N anos e ScrapedText
 * com expiresAt no passado. Leads em LEGAL_HOLD sao preservados.
 *
 * Conformidade: LGPD art. 16 (eliminacao). Registra AuditLog LGPD_PURGE
 * consolidado com contagens; nao grava por-lead para evitar audit bloat
 * (o lead em si deixa de existir e a decisao de purga vale para o batch).
 *
 * Divergencia com src/lib/lgpd/retention.ts:
 *   - retention.ts anonimiza Leads (contactInfo=null) ao expirar updatedAt
 *   - este servico DELETA Leads ao expirar createdAt (spec TASK-1)
 *   - retention.ts continua responsavel por AlertLog/ApiUsageLog (fora do escopo)
 * Ver RUNBOOK-LGPD.md secao "Convivencia com retention.ts".
 */
import 'server-only'
import { prisma } from '@/lib/prisma'
import { auditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { BUSINESS_RULES } from '@/types/constants'

const SYSTEM_ACTOR = 'system:lgpd-purge'

export interface PurgeOptions {
  cutoffYears?: number
  dryRun?: boolean
}

export interface PurgeResult {
  leadsRemoved: number
  scrapedTextsRemoved: number
  cutoffAt: string
  dryRun: boolean
}

/**
 * Executa a purga LGPD. Idempotente: chamadas consecutivas sem novos
 * registros expirados retornam contagens zero.
 *
 * @param opts.cutoffYears — anos de retencao de Lead (default: BUSINESS_RULES.LEAD_RETENTION_YEARS = 2)
 * @param opts.dryRun — se true, calcula contagens via count() sem deletar
 */
export async function purgeExpiredLeads(opts: PurgeOptions = {}): Promise<PurgeResult> {
  const cutoffYears = opts.cutoffYears ?? BUSINESS_RULES.LEAD_RETENTION_YEARS
  const dryRun = opts.dryRun === true
  const now = new Date()
  const cutoff = new Date(now.getTime() - cutoffYears * 365 * 24 * 60 * 60 * 1000)

  const leadWhere = {
    createdAt: { lt: cutoff },
    status: { notIn: ['LEGAL_HOLD' as const] },
  }
  const scrapedWhere = {
    expiresAt: { lt: now, not: null },
  }

  let leadsRemoved = 0
  let scrapedTextsRemoved = 0

  if (dryRun) {
    const [leadsCount, scrapedCount] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.scrapedText.count({ where: scrapedWhere }),
    ])
    leadsRemoved = leadsCount
    scrapedTextsRemoved = scrapedCount
  } else {
    const [leadsRes, scrapedRes] = await Promise.all([
      prisma.lead.deleteMany({ where: leadWhere }),
      prisma.scrapedText.deleteMany({ where: scrapedWhere }),
    ])
    leadsRemoved = leadsRes.count
    scrapedTextsRemoved = scrapedRes.count
  }

  const hasRemovals = leadsRemoved > 0 || scrapedTextsRemoved > 0
  if (hasRemovals && !dryRun) {
    await auditLog({
      action: AUDIT_ACTIONS.LGPD_PURGE,
      entityType: 'Lead',
      entityId: 'batch',
      userId: SYSTEM_ACTOR,
      metadata: {
        leadsRemoved,
        scrapedTextsRemoved,
        cutoffYears,
        cutoffAt: cutoff.toISOString(),
        executedAt: now.toISOString(),
      },
    })
  }

  return {
    leadsRemoved,
    scrapedTextsRemoved,
    cutoffAt: cutoff.toISOString(),
    dryRun,
  }
}
