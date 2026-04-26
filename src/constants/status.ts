/**
 * Domain status constants — Inbound Forge
 * Zero magic strings — sempre importar daqui.
 * Rastreabilidade: content.schema, blog.schema, theme.schema, image-jobs
 */

// ─── Content / Post ──────────────────────────────────────────────────────────

export const CONTENT_STATUS = {
  DRAFT:       'DRAFT',
  REVIEW:      'REVIEW',
  APPROVED:    'APPROVED',
  PUBLISHED:   'PUBLISHED',
  FAILED:      'FAILED',
  PENDING_ART: 'PENDING_ART',
} as const

export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS]

/** Status que permitem aprovação de ângulo */
export const APPROVABLE_CONTENT_STATUSES: ContentStatus[] = [
  CONTENT_STATUS.DRAFT,
  CONTENT_STATUS.REVIEW,
]

// ─── Blog / Article ───────────────────────────────────────────────────────────

export const BLOG_STATUS = {
  DRAFT:     'DRAFT',
  REVIEW:    'REVIEW',
  PUBLISHED: 'PUBLISHED',
} as const

export type BlogStatus = (typeof BLOG_STATUS)[keyof typeof BLOG_STATUS]

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  [BLOG_STATUS.DRAFT]:     'Rascunho',
  [BLOG_STATUS.REVIEW]:    'Em Revisão',
  [BLOG_STATUS.PUBLISHED]: 'Publicado',
}

/** Lista ordenada de status para abas da UI */
export const BLOG_STATUS_TABS = ['ALL', ...Object.values(BLOG_STATUS)] as const

// ─── Theme ────────────────────────────────────────────────────────────────────

export const THEME_STATUS = {
  ACTIVE:        'ACTIVE',
  DEPRIORITIZED: 'DEPRIORITIZED',
  REJECTED:      'REJECTED',
} as const

export type ThemeStatus = (typeof THEME_STATUS)[keyof typeof THEME_STATUS]

// ─── Knowledge (Case & Pain) ──────────────────────────────────────────────────

export const KNOWLEDGE_STATUS = {
  DRAFT:     'DRAFT',
  VALIDATED: 'VALIDATED',
} as const

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUS)[keyof typeof KNOWLEDGE_STATUS]

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  [KNOWLEDGE_STATUS.DRAFT]:     'Rascunho',
  [KNOWLEDGE_STATUS.VALIDATED]: 'Publicado',
}

// ─── Image Job ────────────────────────────────────────────────────────────────

export const IMAGE_JOB_STATUS = {
  PENDING:     'PENDING',
  PROCESSING:  'PROCESSING',
  DONE:        'DONE',
  FAILED:      'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
} as const

export type ImageJobStatus = (typeof IMAGE_JOB_STATUS)[keyof typeof IMAGE_JOB_STATUS]

/** Status que indicam job em andamento (mostra spinner) */
export const IMAGE_JOB_IN_PROGRESS: ImageJobStatus[] = [
  IMAGE_JOB_STATUS.PENDING,
  IMAGE_JOB_STATUS.PROCESSING,
]

/** Status que indicam falha definitiva */
export const IMAGE_JOB_FAILED: ImageJobStatus[] = [
  IMAGE_JOB_STATUS.FAILED,
  IMAGE_JOB_STATUS.DEAD_LETTER,
]

// ─── Video Job Status ─────────────────────────────────────────────────────────

export const VIDEO_JOB_STATUS = {
  PENDING:     'PENDING',
  PROCESSING:  'PROCESSING',
  DONE:        'DONE',
  FAILED:      'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
} as const

export type VideoJobStatus = (typeof VIDEO_JOB_STATUS)[keyof typeof VIDEO_JOB_STATUS]

export const VIDEO_JOB_IN_PROGRESS: VideoJobStatus[] = [
  VIDEO_JOB_STATUS.PENDING,
  VIDEO_JOB_STATUS.PROCESSING,
]

export const VIDEO_JOB_FAILED: VideoJobStatus[] = [
  VIDEO_JOB_STATUS.FAILED,
  VIDEO_JOB_STATUS.DEAD_LETTER,
]

// ─── Health check internal status ─────────────────────────────────────────────

export const HEALTH_STATUS = {
  OK:    'ok',
  ERROR: 'error',
  WARN:  'warn',
} as const

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS]
