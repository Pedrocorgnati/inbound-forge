/**
 * Rastreabilidade: CL-108, TASK-5 ST001
 * Guard de quota mensal por provider de imagem (Ideogram/Flux).
 * Cache Redis 60s para reduzir DB hits.
 * Dispara AlertLog severity=critical quando quota atingida (1x/mês via dedup).
 */
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getServiceLimits } from '@/lib/cost-alert'
import { createAlertIfAbsent } from '@/lib/services/alert.service'

export class QuotaExceededError extends Error {
  constructor(public provider: string, public remaining: number) {
    super(`Quota mensal de ${provider} excedida`)
    this.name = 'QuotaExceededError'
  }
}

export type QuotaProvider = 'ideogram' | 'flux'

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  pct: number
}

const CACHE_TTL_SECONDS = 60

function cacheKey(provider: QuotaProvider): string {
  return `quota:${provider}:${new Date().toISOString().slice(0, 7)}`
}

async function getMonthlyUsage(provider: QuotaProvider): Promise<number> {
  const key = cacheKey(provider)
  const cached = await redis.get<number>(key)
  if (cached !== null) return cached

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const result = await prisma.apiUsageLog.aggregate({
    where: { service: provider, recordedAt: { gte: startOfMonth } },
    _sum: { value: true },
  })

  const used = result._sum.value ?? 0
  await redis.set(key, used, { ex: CACHE_TTL_SECONDS })
  return used
}

export async function checkQuota(provider: QuotaProvider): Promise<QuotaResult> {
  const limits = getServiceLimits()
  const limit = limits[provider] ?? 500
  const used = await getMonthlyUsage(provider)
  const pct = (used / limit) * 100
  const remaining = Math.max(0, limit - used)
  const allowed = used < limit

  if (pct >= 100) {
    const month = new Date().toISOString().slice(0, 7)
    await createAlertIfAbsent({
      type: `quota.exceeded:${provider}:${month}`,
      severity: 'critical',
      message: `Quota mensal de ${provider} atingida: ${used}/${limit} requests (${pct.toFixed(1)}%).`,
    })
  }

  return { allowed, used, limit, remaining, pct }
}
