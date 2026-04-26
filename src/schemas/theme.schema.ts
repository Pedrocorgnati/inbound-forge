import { z } from 'zod'
import { THEME_STATUS } from '@/constants/status'

export const RejectThemeSchema = z.object({
  reason: z.string().min(10, 'Motivo de rejeição deve ter no mínimo 10 caracteres.'),
})

export const ListThemesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([THEME_STATUS.ACTIVE, THEME_STATUS.DEPRIORITIZED, THEME_STATUS.REJECTED]).optional(),
  isNew: z.coerce.boolean().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  // Intake-Review TASK-4 ST001 (CL-197): filtros adicionais.
  painCategory: z.string().trim().min(1).max(255).optional(),
  niche: z.string().trim().min(1).max(255).optional(),
  scoreMin: z.coerce.number().int().min(0).max(100).optional(),
  scoreMax: z.coerce.number().int().min(0).max(100).optional(),
})

export const GenerateThemesSchema = z.object({
  forceRegenerate: z.boolean().optional().default(false),
})

export const ScoreThemeSchema = z.object({
  geoReady: z.boolean().optional(),
})

export const NicheOpportunitySchema = z.object({
  isGeoReady: z.boolean().default(false),
  description: z.string().min(3).optional(),
})

export type RejectThemeInput = z.infer<typeof RejectThemeSchema>
export type ListThemesInput = z.infer<typeof ListThemesSchema>
export type GenerateThemesInput = z.infer<typeof GenerateThemesSchema>
export type ScoreThemeInput = z.infer<typeof ScoreThemeSchema>
export type NicheOpportunityInput = z.infer<typeof NicheOpportunitySchema>
