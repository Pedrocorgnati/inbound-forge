// module-9: Image Worker Types
// Rastreabilidade: INT-056, INT-057, FEAT-creative-generation-001

import type { TemplateType } from './image-template'

// ─── Status & Provider ───────────────────────────────────────────────────────

export type ImageJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'DONE'
  | 'FAILED'
  | 'DEAD_LETTER'

export type ImageProvider = 'ideogram' | 'flux' | 'static'

// ─── Dimensions ──────────────────────────────────────────────────────────────

export interface ImageDimensions {
  widthPx: number
  heightPx: number
  channel?: string
}

// ─── ImageJob Interface (mirrors Prisma model + new fields) ──────────────────

export interface ImageJob {
  id: string
  contentPieceId?: string | null
  templateId?: string | null
  provider: string
  status: ImageJobStatus
  prompt?: string | null
  imageUrl?: string | null
  errorMessage?: string | null
  retryCount: number
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
}

// ─── Worker Health ────────────────────────────────────────────────────────────

export interface WorkerHealthPayload {
  workerType: string
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
  lastBeatAt: Date
  metadata?: {
    costLog?: CostLogEntry[]
    totalCostUsd?: number
    queueDepth?: number
    [key: string]: unknown
  } | null
}

export interface CostLogEntry {
  jobId: string
  provider: ImageProvider
  costUsd: number
  templateType: TemplateType
  durationMs: number
  recordedAt: string
}
