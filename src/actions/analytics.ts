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
  if (response) return null
  return getFunnelMetrics(period, user!.id)
}

export async function getContentPerformance() {
  return { data: [] }
}

export async function getChannelBreakdown(period: AnalyticsPeriod = '30d') {
  const { user, response } = await requireSession()
  if (response) return []
  return getChannelPerformance(period, user!.id)
}

export async function getReconciliationSummary() {
  const { user, response } = await requireSession()
  if (response) return null
  return getReconciliationStats(user!.id)
}
