import { z } from 'zod'

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreatePatternDto = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  /** Dor de referência — obrigatório */
  painId: z.string().uuid('painId deve ser um UUID válido'),
  // fix REPROVADO (finding TASK-015): caseId e OBRIGATORIO e assim permanece — o
  // schema Prisma (SolutionPattern.caseId) e NOT NULL com relacao `case` requerida.
  // A contradicao real estava no PatternForm, que rotulava o campo como "opcional"
  // e enviava payload sem caseId -> create falhava com 422. A correcao alinha o
  // FORM ao schema (campo obrigatorio + validacao), sem migration arriscada.
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
  // fix REPROVADO (finding TASK-015): busca textual por nome/descricao.
  search: z.string().trim().min(1).optional(),
})

export type ListPatternsQuery = z.infer<typeof ListPatternsQueryDto>
