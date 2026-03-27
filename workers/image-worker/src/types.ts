// module-9: Worker internal types
export type TemplateType =
  | 'CAROUSEL'
  | 'STATIC_LANDSCAPE'
  | 'STATIC_PORTRAIT'
  | 'VIDEO_COVER'
  | 'BEFORE_AFTER'
  | 'ERROR_CARD'
  | 'SOLUTION_CARD'
  | 'BACKSTAGE_CARD'

export type ImageJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'DONE'
  | 'FAILED'
  | 'DEAD_LETTER'

export type ImageProvider = 'ideogram' | 'flux' | 'static'

export interface CostLogEntry {
  jobId:        string
  provider:     ImageProvider
  costUsd:      number
  templateType: TemplateType
  durationMs:   number
  recordedAt:   string
}
