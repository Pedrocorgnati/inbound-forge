'use server'

import { requireSession } from '@/lib/api-auth'
import {
  getFunnelMetrics,
  getChannelPerformance,
  getReconciliationStats,
} from '@/lib/analytics-queries'
import type { AnalyticsPeriod } from '@/types/analytics'

export async function getAnalyticsOverview(period: AnalyticsPeriod = '30d') {
  const { user, response } = await requireSession()
  if (response) return { error: 'Não autorizado', data: null }
  const data = await getFunnelMetrics(period, user!.id)
  return { data }
}

export async function getContentPerformance() {
  const { user, response } = await requireSession()
  if (response) return { error: 'Não autorizado', data: [] }
  void user
  return { data: [] }
}

export async function getChannelBreakdown(period: AnalyticsPeriod = '30d') {
  const { user, response } = await requireSession()
  if (response) return { error: 'Não autorizado', data: [] }
  const data = await getChannelPerformance(period, user!.id)
  return { data }
}

export async function getReconciliationSummary() {
  const { user, response } = await requireSession()
  if (response) return { error: 'Não autorizado', data: null }
  const data = await getReconciliationStats(user!.id)
  return { data }
}
