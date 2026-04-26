import { BUSINESS_RULES } from '@/types/constants'
import type { PrismaClient } from '@prisma/client'
import { auditLog } from '@/lib/audit'

// COMP-004: TTL/retention policies
export const RETENTION_POLICIES = {
  Lead: {
    ttlYears: BUSINESS_RULES.LEAD_RETENTION_YEARS, // 2 anos
    description: 'Dados de leads — retidos por 2 anos após último contato',
    deleteFields: ['contactInfo'], // criptografado antes
  },
  ScrapedText: {
    ttlHours: BUSINESS_RULES.SCRAPED_TEXT_TTL_HOURS, // 1h
    description: 'Textos scrapeados — deletados após 1h',
  },
  AlertLog: {
    ttlDays: BUSINESS_RULES.ALERT_LOG_RETENTION_DAYS, // 30d
    description: 'Logs de alerta — retidos por 30 dias',
  },
  ApiUsageLog: {
    ttlDays: BUSINESS_RULES.API_USAGE_LOG_RETENTION_DAYS, // 90d
    description: 'Logs de uso de API — retidos por 90 dias',
  },
} as const

// Job de limpeza — a ser chamado por cron (module-14)
export async function runRetentionCleanup(
  prisma: PrismaClient
): Promise<{ deleted: Record<string, number> }> {
  const now = new Date()
  const results: Record<string, number> = {}

  // ScrapedText: 1h
  const scrapedCutoff = new Date(
    now.getTime() - BUSINESS_RULES.SCRAPED_TEXT_TTL_HOURS * 60 * 60 * 1000
  )
  const { count: scrapedCount } = await prisma.scrapedText.deleteMany({
    where: { createdAt: { lt: scrapedCutoff } },
  })
  results.ScrapedText = scrapedCount

  // AlertLog: 30d
  const alertCutoff = new Date(
    now.getTime() - BUSINESS_RULES.ALERT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  )
  const { count: alertCount } = await prisma.alertLog.deleteMany({
    where: { createdAt: { lt: alertCutoff } },
  })
  results.AlertLog = alertCount

  // ApiUsageLog: 90d
  const apiCutoff = new Date(
    now.getTime() - BUSINESS_RULES.API_USAGE_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  )
  const { count: apiCount } = await prisma.apiUsageLog.deleteMany({
    where: { recordedAt: { lt: apiCutoff } },
  })
  results.ApiUsageLog = apiCount

  // Lead: 2 anos — anonimiza contactInfo (não deleta o lead)
  const leadCutoff = new Date(
    now.getTime() - BUSINESS_RULES.LEAD_RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000
  )
  const staleLeads = await prisma.lead.findMany({
    where: {
      updatedAt: { lt: leadCutoff },
      contactInfo: { not: null },
    },
    select: { id: true },
  })

  let leadCount = 0
  for (const lead of staleLeads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { contactInfo: null },
    })
    await auditLog({
      action: 'lead.retention_cleanup',
      entityType: 'Lead',
      entityId: lead.id,
      userId: 'system',
      leadId: lead.id,
      metadata: { reason: 'LGPD retention TTL exceeded', ttlYears: BUSINESS_RULES.LEAD_RETENTION_YEARS },
    })
    leadCount++
  }
  results.Lead = leadCount

  return { deleted: results }
}
