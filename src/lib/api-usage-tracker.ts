// src/lib/api-usage-tracker.ts
// SCHEMA NOTE: ApiUsageLog real schema uses: service, metric, value (Float), cost (Float), recordedAt
// Task spec assumed: tokens, costUSD, operatorId, operationId — not present in real schema.
// Adaptation: metric='tokens' for anthropic, metric='requests' for others; value=count; cost=costUSD
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { checkCostAlerts } from '@/lib/cost-alert'
import { logger } from '@/lib/logger'

type ApiService = 'anthropic' | 'ideogram' | 'flux' | 'browserless' | 'instagram'

interface TrackApiUsageParams {
  service: ApiService
  tokens?: number     // Used only for anthropic; ignored for other services
  costUSD: number     // Stored in cost column
  operationId?: string // Not stored (schema lacks this column); kept for caller compat
  operatorId: string  // Not stored (schema lacks this column); used for cache key + alerts
}

export async function trackApiUsage(params: TrackApiUsageParams): Promise<void> {
  const metric = params.service === 'anthropic' ? 'tokens' : 'requests'
  const value = params.service === 'anthropic' ? (params.tokens ?? 0) : 1

  // 1. Criar ApiUsageLog (awaited — crítico; erros propagam para o caller)
  await prisma.apiUsageLog.create({
    data: {
      service: params.service,
      metric,
      value,
      cost: params.costUSD,
    },
  })

  // 2. Verificar threshold — fire-and-forget: nunca bloqueia o caller
  checkCostAlerts(params.service, params.operatorId).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'unknown'
    logger.error('api-usage-tracker', 'Cost alert check failed (non-critical)', { error: message })
  })

  // 3. Invalidar cache Redis — todos os períodos e variantes de totais
  const cachePrefix = `api-usage:${params.operatorId}`
  const keysToInvalidate = [
    `${cachePrefix}:day`,
    `${cachePrefix}:week`,
    `${cachePrefix}:month`,
    `${cachePrefix}:day:totals`,
    `${cachePrefix}:week:totals`,
    `${cachePrefix}:month:totals`,
  ]
  await redis.del(...keysToInvalidate)
}
