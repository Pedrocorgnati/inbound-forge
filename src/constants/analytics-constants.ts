// Analytics Constants — module-14
// INT-003, INT-027, INT-040

import type { AnalyticsPeriod } from '@/types/analytics'
import { Channel } from '@/types/enums'

export const ANALYTICS_PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

// Cores por canal — Canal enum: BLOG | LINKEDIN | INSTAGRAM | TIKTOK | YOUTUBE_SHORTS
export const CHANNEL_COLORS: Record<Channel, string> = {
  [Channel.BLOG]: '#4F46E5',           // indigo
  [Channel.LINKEDIN]: '#0A66C2',       // linkedin blue
  [Channel.INSTAGRAM]: '#E4405F',      // instagram pink
  [Channel.TIKTOK]: '#69C9D0',         // tiktok teal — post-MVP CL-064
  [Channel.YOUTUBE_SHORTS]: '#FF0000', // youtube red — post-MVP CL-065
}

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  publications: 'Publicações',
  clicks: 'Cliques',
  conversations: 'Conversas',
  meetings: 'Reuniões',
  proposals: 'Propostas',
}

// Performance budget — PERF-001
export const ANALYTICS_PERFORMANCE_BUDGET = {
  chartsRender: 1000,  // ms
  apiResponse: 500,    // ms
  exportCSV: 3000,     // ms
} as const

// Cache TTLs (segundos)
export const ANALYTICS_CACHE_TTL = {
  funnel: 300,           // 5min
  themeRanking: 300,     // 5min
  channelPerformance: 300, // 5min
  reconciliation: 60,    // 1min
} as const

// GA4 event names (referenciados em ga4-events.ts)
export const GA4_EVENT_NAMES = {
  ANALYTICS_EXPORTED: 'analytics_exported',
} as const
