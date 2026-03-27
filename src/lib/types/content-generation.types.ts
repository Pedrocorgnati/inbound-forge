import type { Channel, ContentAngle, FunnelStage } from '@/types/enums'

// ─── Knowledge Context ────────────────────────────────────────────────────────

export interface KnowledgePain {
  id: string
  title: string
  description: string
}

export interface KnowledgeCase {
  id: string
  title: string
  result: string
}

export interface KnowledgePattern {
  id: string
  title: string
  description: string
}

export interface KnowledgeContext {
  theme: {
    id: string
    title: string
  }
  pains: KnowledgePain[]
  cases: KnowledgeCase[]
  patterns: KnowledgePattern[]
}

// ─── Angle Generation ─────────────────────────────────────────────────────────

export interface AngleGenerationRequest {
  themeId: string
  funnelStage: FunnelStage
  targetChannel: Channel
  forceRegenerate: boolean
}

export interface GeneratedAngle {
  angle: ContentAngle
  body: string
  charCount: number
  ctaText: string
  ctaDestination: string
  hashtags: string[]
}

export interface AngleGenerationResult {
  contentPieceId: string
  angles: GeneratedAngle[]
  tokensUsed: {
    input: number
    output: number
  }
}

// ─── Channel Adaptation ───────────────────────────────────────────────────────

export interface ChannelAdaptationRequest {
  angleId: string
  currentBody: string
  targetChannel: Channel
  funnelStage: FunnelStage
  ctaDestination: string
  ctaCustomText?: string
}

export interface ChannelAdaptationResult {
  adaptedBody: string
  charCount: number
  hashtags: string[]
  truncated: boolean
}

// ─── Prompt Feedback ──────────────────────────────────────────────────────────

export interface FeedbackHint {
  pattern: string
  hint: string
  rejectionCount: number
}

// ─── Content Editor State ─────────────────────────────────────────────────────

export interface ContentEditorState {
  selectedChannel: Channel
  isGenerating: boolean
  selectedAngleId: string | null
}
