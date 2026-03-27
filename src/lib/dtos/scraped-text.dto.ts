/**
 * DTOs para ScrapedText e Source — module-6
 * Rastreabilidade: TASK-0 ST002, INT-052
 * SEC-001: Nenhum campo sensível exposto nos tipos públicos
 */

import { z } from 'zod'

// ─── Source DTOs ─────────────────────────────────────────────────────────────

export const CreateSourceSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(1024),
  selector: z.string().max(512).optional(),
  crawlFrequency: z.enum(['daily', 'weekly']).default('daily'),
})

export const UpdateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  selector: z.string().max(512).nullable().optional(),
  crawlFrequency: z.enum(['daily', 'weekly']).optional(),
})

export type CreateSourceDto = z.infer<typeof CreateSourceSchema>
export type UpdateSourceDto = z.infer<typeof UpdateSourceSchema>

export interface SourceDto {
  id: string
  name: string
  url: string
  isActive: boolean
  isProtected: boolean
  selector: string | null
  crawlFrequency: string
  lastCrawledAt: string | null
  createdAt: string
}

// ─── ScrapedText DTOs ────────────────────────────────────────────────────────

export interface ScrapedTextDto {
  id: string
  sourceId: string
  url: string
  title: string | null
  isPainCandidate: boolean
  isProcessed: boolean
  piiRemoved: boolean
  batchId: string | null
  classificationResult: unknown
  createdAt: string
  // rawText e processedText NUNCA incluídos no DTO público (SEC-008)
}

export const ScrapedTextFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isPainCandidate: z.coerce.boolean().optional(),
  batchId: z.string().optional(),
  sourceId: z.string().optional(),
})

export type ScrapedTextFilters = z.infer<typeof ScrapedTextFiltersSchema>

// ─── Worker trigger DTOs ─────────────────────────────────────────────────────

export const TriggerScrapingSchema = z.object({
  sourceIds: z.array(z.string().cuid()).optional().default([]),
  batchSize: z.number().int().min(1).max(50).optional(),
})

export type TriggerScrapingDto = z.infer<typeof TriggerScrapingSchema>

export interface TriggerScrapingResponseDto {
  batchId: string
  queued: number
}
