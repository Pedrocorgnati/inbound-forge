import { z } from 'zod'

// ObjectionType espelha o enum Prisma real: PRICE | TRUST | TIMING | NEED | AUTHORITY
const ObjectionTypeEnum = z.enum(['PRICE', 'TRUST', 'TIMING', 'NEED', 'AUTHORITY'])

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreateObjectionDto = z.object({
  /** Conteúdo da objeção (ex: "Inbound demora muito para dar resultado") */
  content: z.string().min(5, 'Objeção deve ter no mínimo 5 caracteres'),
  /** Tipo de objeção — deve ser um dos valores do enum */
  type: ObjectionTypeEnum,
})

export type CreateObjectionInput = z.infer<typeof CreateObjectionDto>

// ─── Update ──────────────────────────────────────────────────────────────────

export const UpdateObjectionDto = CreateObjectionDto.partial()

export type UpdateObjectionInput = z.infer<typeof UpdateObjectionDto>

// ─── Response ─────────────────────────────────────────────────────────────────

export const ObjectionResponseDto = z.object({
  id: z.string(),
  content: z.string(),
  type: ObjectionTypeEnum,
  status: z.enum(['DRAFT', 'VALIDATED']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ObjectionResponse = z.infer<typeof ObjectionResponseDto>

// ─── Query params ─────────────────────────────────────────────────────────────

export const ListObjectionsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: ObjectionTypeEnum.optional(),
  status: z.enum(['DRAFT', 'VALIDATED']).optional(),
})

export type ListObjectionsQuery = z.infer<typeof ListObjectionsQueryDto>
