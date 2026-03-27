// src/lib/cost-alert.ts
// SCHEMA NOTE: AlertLog real schema: type, severity, message, resolved, resolvedAt, createdAt
// No service, operatorId, metadata fields. Encoding: type='cost_threshold:anthropic' for dedup.
import { prisma } from '@/lib/prisma'

const COST_ALERT_THRESHOLD = 0.8   // 80%
const COST_EXCEEDED_THRESHOLD = 1.0 // 100%

// Limites padrão — sobrescritos por variáveis de ambiente
const DEFAULT_LIMITS: Record<string, number> = {
  anthropic:   1_000_000, // tokens
  ideogram:    1_000,     // requests
  flux:        500,        // requests
  browserless: 500,        // requests
  instagram:   200,        // calls/hora
}

export function getServiceLimits(): Record<string, number> {
  return {
    anthropic:   Number(process.env.API_LIMIT_ANTHROPIC   ?? DEFAULT_LIMITS.anthropic),
    ideogram:    Number(process.env.API_LIMIT_IDEOGRAM    ?? DEFAULT_LIMITS.ideogram),
    flux:        Number(process.env.API_LIMIT_FLUX        ?? DEFAULT_LIMITS.flux),
    browserless: Number(process.env.API_LIMIT_BROWSERLESS ?? DEFAULT_LIMITS.browserless),
    instagram:   Number(process.env.API_LIMIT_INSTAGRAM   ?? DEFAULT_LIMITS.instagram),
  }
}

// SCHEMA NOTE: ApiUsageLog has no operatorId — aggregation is global per service.
// operatorId param kept for interface compatibility; not used in DB query.
export async function getMonthlyUsage(
  service: string,
  _operatorId: string
): Promise<number> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  if (service === 'anthropic') {
    const result = await prisma.apiUsageLog.aggregate({
      _sum: { value: true },
      where: {
        service,
        metric: 'tokens',
        recordedAt: { gte: startOfMonth },
      },
    })
    return result._sum.value ?? 0
  }

  // Para outros serviços: contar requests (cada log = 1 request)
  return prisma.apiUsageLog.count({
    where: {
      service,
      metric: 'requests',
      recordedAt: { gte: startOfMonth },
    },
  })
}

export async function checkCostAlerts(
  service: string,
  operatorId: string
): Promise<void> {
  const limits = getServiceLimits()
  const limit = limits[service]
  if (!limit) return

  const usage = await getMonthlyUsage(service, operatorId)
  const ratio = usage / limit
  const usagePercent = Math.round(ratio * 100)

  if (ratio >= COST_EXCEEDED_THRESHOLD) {
    // AlertLog type encodes service for deduplication (schema lacks service/metadata columns)
    const alertType = `cost_exceeded:${service}`
    const existing = await prisma.alertLog.findFirst({
      where: { type: alertType, resolved: false },
    })
    if (!existing) {
      await prisma.alertLog.create({
        data: {
          type: alertType,
          severity: 'critical',
          message: `Uso de ${service} em ${usagePercent}% do limite mensal — limite excedido. (service=${service}, usagePercent=${usagePercent}, threshold=${COST_EXCEEDED_THRESHOLD})`,
          resolved: false,
        },
      })
    }
    return
  }

  if (ratio >= COST_ALERT_THRESHOLD) {
    const alertType = `cost_threshold:${service}`
    const existing = await prisma.alertLog.findFirst({
      where: { type: alertType, resolved: false },
    })
    if (!existing) {
      await prisma.alertLog.create({
        data: {
          type: alertType,
          severity: 'warning',
          message: `Uso de ${service} em ${usagePercent}% do limite mensal. (service=${service}, usagePercent=${usagePercent}, threshold=${COST_ALERT_THRESHOLD})`,
          resolved: false,
        },
      })
    }
  }
}
