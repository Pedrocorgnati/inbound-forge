// module-9: Image Template Types
// Rastreabilidade: INT-056, INT-060, FEAT-creative-generation-001

// ─── Template Types ───────────────────────────────────────────────────────────

export type TemplateType =
  | 'CAROUSEL'
  | 'STATIC_LANDSCAPE'
  | 'STATIC_PORTRAIT'
  | 'VIDEO_COVER'
  | 'BEFORE_AFTER'
  | 'ERROR_CARD'
  | 'SOLUTION_CARD'
  | 'BACKSTAGE_CARD'

export type TemplateChannel = 'instagram' | 'linkedin' | 'blog'

// ─── Template Config ──────────────────────────────────────────────────────────

export interface TemplateConfig {
  brandColor?: string
  fontFamily?: string
  overlayOpacity?: number
  [key: string]: unknown
}

// ─── ImageTemplate Interface ──────────────────────────────────────────────────

export interface ImageTemplate {
  id: string
  name: string
  templateType: TemplateType
  channel: TemplateChannel
  widthPx: number
  heightPx: number
  configJson?: TemplateConfig | null
  isActive: boolean
  createdAt: Date
  updatedAt?: Date | null
}
