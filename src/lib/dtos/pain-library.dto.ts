import { z } from 'zod'

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreatePainDto = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  /** Setores afetados por esta dor */
  sectors: z.array(z.string()).min(1, 'Informe ao menos um setor'),
})

export type CreatePainInput = z.infer<typeof CreatePainDto>

// ─── Update ──────────────────────────────────────────────────────────────────

export const UpdatePainDto = CreatePainDto.partial()

export type UpdatePainInput = z.infer<typeof UpdatePainDto>

// ─── Response ─────────────────────────────────────────────────────────────────

export const PainResponseDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sectors: z.array(z.string()),
  status: z.enum(['DRAFT', 'VALIDATED']),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Contagem de cases vinculados */
  casesCount: z.number().default(0),
})

export type PainResponse = z.infer<typeof PainResponseDto>

// ─── Query params ─────────────────────────────────────────────────────────────

export const ListPainsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sector: z.string().optional(),
  status: z.enum(['DRAFT', 'VALIDATED']).optional(),
})

export type ListPainsQuery = z.infer<typeof ListPainsQueryDto>

// ─── Link/Unlink ─────────────────────────────────────────────────────────────

export const LinkCaseDto = z.object({
  caseId: z.string().uuid('caseId deve ser um UUID válido'),
})

export type LinkCaseInput = z.infer<typeof LinkCaseDto>
