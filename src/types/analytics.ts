// Analytics Types — module-14
// INT-003, INT-027, INT-040, INT-041

import type { Channel } from '@/types/enums'

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface FunnelStageData {
  label: string
  count: number
  conversionRate: number // em relação ao estágio anterior (0-100)
}

export interface FunnelMetrics {
  period: AnalyticsPeriod
  stages: FunnelStageData[]
}

export interface ThemeRanking {
  themeId: string
  themeName: string
  conversionScore: number
  leadsCount: number
  conversionsCount: number
  trend: number[]        // últimos 7 pontos de conversionScore
  channelBreakdown: { channel: Channel; count: number }[]
}

export interface ChannelPerformance {
  channel: Channel
  leadsCount: number
  conversionsCount: number
  conversionRate: number
}

export interface ReconciliationStats {
  clicksWithoutConversion: number
  conversionsWithoutPost: number
  pendingResolution: number
}
