/**
 * Cost Tracking — Rastreia custo operacional por provider/servico
 * Rastreabilidade: CL-128, TASK-7 ST002
 * Meta: $20-35/mes total ($28 target)
 */
import { prisma } from '@/lib/prisma'
import { createAlertIfAbsent } from '@/lib/services/alert.service'

export type CostProvider = 'claude' | 'ideogram' | 'flux' | 'vercel' | 'railway' | 'supabase' | 'other'

export interface TrackCostParams {
  provider: CostProvider
  amount: number
  operation: string
  metadata?: Record<string, unknown>
}

export interface MonthlyCostSummary {
  provider: CostProvider
  totalUsd: number
  operationCount: number
}

/** Meta mensal de custo em USD */
export const MONTHLY_COST_TARGET_USD = 35
export const MONTHLY_COST_ALERT_THRESHOLD = 0.8 // alerta a 80% da meta

/**
 * Registra custo de uma operacao por provider.
 * Rastreabilidade: CL-128, TASK-7 ST002
 */
export async function trackCost(params: TrackCostParams): Promise<void> {
  const { provider, amount, operation, metadata } = params

  await prisma.costLog.create({
    data: {
      provider,
      amount,
      operation,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      recordedAt: new Date(),
    },
  })

  // Verificar se custo mensal ultrapassou threshold de alerta
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyTotal = await getMonthlyTotalAll(startOfMonth)

  if (monthlyTotal >= MONTHLY_COST_TARGET_USD * MONTHLY_COST_ALERT_THRESHOLD) {
    await createAlertIfAbsent({
      type: 'COST_THRESHOLD_EXCEEDED',
      severity: 'MEDIUM',
      message: `Custo mensal acumulado $${monthlyTotal.toFixed(2)} atingiu ${Math.round(MONTHLY_COST_ALERT_THRESHOLD * 100)}% da meta ($${MONTHLY_COST_TARGET_USD})`,
    }).catch((e) => console.error('[cost-tracking] Falha ao criar alerta:', e))
  }
}

/**
 * Custo acumulado de um provider no mes atual (ou desde startDate).
 */
export async function getMonthlyTotal(
  provider: CostProvider,
  startDate?: Date
): Promise<number> {
  const from = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const result = await prisma.costLog.aggregate({
    where: { provider, recordedAt: { gte: from } },
    _sum: { amount: true },
  })

  return result._sum.amount ?? 0
}

/**
 * Custo total acumulado de todos os providers (para comparar com a meta).
 */
export async function getMonthlyTotalAll(startDate?: Date): Promise<number> {
  const from = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const result = await prisma.costLog.aggregate({
    where: { recordedAt: { gte: from } },
    _sum: { amount: true },
  })

  return result._sum.amount ?? 0
}

/**
 * Sumario de custos por provider para o mes atual.
 */
export async function getMonthlyCostSummary(startDate?: Date): Promise<MonthlyCostSummary[]> {
  const from = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const grouped = await prisma.costLog.groupBy({
    by: ['provider'],
    where: { recordedAt: { gte: from } },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
  })

  return grouped.map((row) => ({
    provider: row.provider as CostProvider,
    totalUsd: row._sum.amount ?? 0,
    operationCount: row._count.id,
  }))
}
