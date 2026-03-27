import { z } from 'zod'

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreatePatternDto = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  /** Dor de referência — obrigatório */
  painId: z.string().uuid('painId deve ser um UUID válido'),
  /** Case de referência — opcional */
  caseId: z.string().uuid('caseId deve ser um UUID válido'),
})

export type CreatePatternInput = z.infer<typeof CreatePatternDto>

// ─── Update ──────────────────────────────────────────────────────────────────

export const UpdatePatternDto = CreatePatternDto.partial()

export type UpdatePatternInput = z.infer<typeof UpdatePatternDto>

// ─── Response ─────────────────────────────────────────────────────────────────

export const PatternResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  painId: z.string(),
  caseId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PatternResponse = z.infer<typeof PatternResponseDto>

// ─── Query params ─────────────────────────────────────────────────────────────

export const ListPatternsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  painId: z.string().uuid().optional(),
})

export type ListPatternsQuery = z.infer<typeof ListPatternsQueryDto>
