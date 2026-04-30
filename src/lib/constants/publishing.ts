/**
 * Constantes de publicação — module-12-calendar-publishing
 * INT-065 | INT-118 | INT-070 | INT-113
 */

export const INSTAGRAM_RATE_LIMITS = {
  requestsPerHour: 200,
  postsPerDay: 100,
  refreshTokenIntervalDays: 60, // refresh token antes de expirar (expira em 90 dias)
} as const

export const PUBLISHING_CHANNELS = {
  INSTAGRAM: {
    label: 'Instagram',
    requiresApproval: true, // INT-070: aprovação humana obrigatória
    imageRequired: true,
    maxCaptionLength: 2200,
    maxHashtags: 30,
    dimensions: { width: 1080, height: 1350 }, // portrait padrão
    platform: 'instagram_graph_api',
  },
  LINKEDIN: {
    label: 'LinkedIn',
    requiresApproval: true, // INT-070
    imageRequired: false,
    maxCaptionLength: 3000,
    maxHashtags: 5,
    assistedOnly: true, // INT-117: NÃO usar API LinkedIn
    platform: 'linkedin_assisted',
  },
  BLOG: {
    label: 'Blog',
    requiresApproval: true,
    imageRequired: false,
    maxCaptionLength: 10000,
    maxHashtags: 10,
    platform: 'blog_cms',
  },
} as const

export const UTM_DEFAULTS = {
  source: 'social',
  medium: 'organic',
  campaign: 'inbound-forge',
} as const

export const PUBLISHING_QUEUE = {
  maxAttempts: 3,
  backoffMinutesPerAttempt: 10,
  rateLimitRetryHours: 1,
  pollingMaxSeconds: 30,
  pollingIntervalSeconds: 3,
} as const

export const TOKEN_REFRESH_THRESHOLD_DAYS = 60
export const TOKEN_EXPIRY_WARNING_DAYS = 7

// TASK-13 ST001 (M11.7 / G-003) — alertas tiered para refresh de token Instagram.
// info=30d (preventivo), warning=15d (acao recomendada), critical=7d (urgente).
export const TOKEN_ALERT_THRESHOLDS = {
  info: 30,
  warning: 15,
  critical: 7,
} as const

export type TokenAlertSeverity = 'none' | 'info' | 'warning' | 'critical'
