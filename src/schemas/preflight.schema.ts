import { z } from 'zod'

/**
 * Schemas de entrada dos endpoints /api/v1/{angles,content,art}/preflight.
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TASK-003 (P0).
 */

const count = z.number().int().positive().max(50).optional()

export const AnglesPreflightSchema = z.object({
  themeId: z.string().min(1, 'themeId obrigatório'),
  count,
})

export const ContentPreflightSchema = z.object({
  themeId: z.string().min(1, 'themeId obrigatório'),
  count,
})

export const ArtPreflightSchema = z.object({
  contentPieceId: z.string().min(1).optional(),
  templateType: z.string().min(1).optional(),
  count,
})

export type AnglesPreflightInput = z.infer<typeof AnglesPreflightSchema>
export type ContentPreflightInput = z.infer<typeof ContentPreflightSchema>
export type ArtPreflightInput = z.infer<typeof ArtPreflightSchema>

/**
 * Schemas de entrada dos endpoints de preflight OPERACIONAL (impacto, nao custo).
 * Rastreabilidade: loop 05-27-inbound-forge-user-friendly TAREFA-020 (P2).
 */

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD')

export const KillSwitchPreflightSchema = z.object({
  flag: z.string().min(1, 'flag obrigatória'),
  action: z.enum(['disable', 'enable']),
})

export const WorkerRestartPreflightSchema = z.object({
  worker: z.enum(['scraping', 'image', 'video', 'publishing']),
})

export const Ga4RefreshPreflightSchema = z.object({
  startDate: ISO_DATE,
  endDate: ISO_DATE,
  metrics: z.array(z.string().min(1)).optional(),
})

export const TranslatePreflightSchema = z.object({
  articleId: z.string().min(1, 'articleId obrigatório'),
  targetLocales: z.array(z.string().min(2)).min(1, 'ao menos um locale alvo'),
})

export type KillSwitchPreflightInput = z.infer<typeof KillSwitchPreflightSchema>
export type WorkerRestartPreflightInput = z.infer<typeof WorkerRestartPreflightSchema>
export type Ga4RefreshPreflightInput = z.infer<typeof Ga4RefreshPreflightSchema>
export type TranslatePreflightInput = z.infer<typeof TranslatePreflightSchema>
