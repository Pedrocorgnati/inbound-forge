import { z } from 'zod'

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreateCaseDto = z.object({
  /** Nome/título do case (ex: "Agência X triplicou leads") */
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  /** Setor de atuação do cliente */
  sector: z.string().min(2, 'Setor é obrigatório'),
  /** Tipo de sistema/solução implementada */
  systemType: z.string().min(2, 'Tipo de sistema é obrigatório'),
  /** Resultado obtido — mínimo 50 chars para garantir substância */
  outcome: z.string().min(50, 'Resultado deve ter no mínimo 50 caracteres'),
  /** Se o resultado é quantificável (ex: "30% de aumento") */
  hasQuantifiableResult: z.boolean().default(false),
  /** Rascunho — não visível em análises enquanto true */
  isDraft: z.boolean().default(true),
})

export type CreateCaseInput = z.infer<typeof CreateCaseDto>

// ─── Update ──────────────────────────────────────────────────────────────────

export const UpdateCaseDto = CreateCaseDto.partial()

export type UpdateCaseInput = z.infer<typeof UpdateCaseDto>

// ─── Response ─────────────────────────────────────────────────────────────────

export const CaseResponseDto = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string(),
  systemType: z.string(),
  outcome: z.string(),
  hasQuantifiableResult: z.boolean(),
  isDraft: z.boolean(),
  lastAutosave: z.date().nullable(),
  status: z.enum(['DRAFT', 'VALIDATED']),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z
    .object({
      casePains: z.number(),
      themes: z.number(),
    })
    .optional(),
})

export type CaseResponse = z.infer<typeof CaseResponseDto>

// ─── Query params ─────────────────────────────────────────────────────────────

export const ListCasesQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'VALIDATED']).optional(),
  isDraft: z.coerce.boolean().optional(),
})

export type ListCasesQuery = z.infer<typeof ListCasesQueryDto>
