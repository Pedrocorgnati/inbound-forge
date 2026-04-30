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
  /** MS13-B001: taxa real conversions/leads*100 calculada do período (CX-01). */
  realConversionRate: number
  /** MS13-B002: score composto persistido em Theme.priorityScore. */
  priorityScore: number
  /**
   * @deprecated MS13-B001/B002. Mantido por compatibilidade com clientes legados que
   * esperam o campo `conversionScore`. Reflete agora a taxa real (CX-01); novos clientes
   * devem ler `realConversionRate`.
   */
  conversionScore: number
  leadsCount: number
  conversionsCount: number
  /** Tendência semanal: últimos 7 buckets de contagens de conversão. */
  trend: number[]
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
