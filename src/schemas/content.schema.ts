import { z } from 'zod'

export const GenerateContentSchema = z.object({
  themeId: z.string().uuid(),
  forceRegenerate: z.boolean().optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).optional(),
  targetChannel: z.enum(['LINKEDIN', 'INSTAGRAM', 'BLOG']).optional(),
})

export const ApproveContentSchema = z.object({
  angleId: z.enum(['AGGRESSIVE', 'CONSULTIVE', 'AUTHORIAL']),
  editedText: z.string().nullable().optional(),
})

export const RejectContentSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
})

export const EditContentSchema = z.object({
  editedText: z.string().min(10),
})

export const ListContentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  themeId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'FAILED', 'PENDING_ART']).optional(),
})

export type GenerateContentInput = z.infer<typeof GenerateContentSchema>
export type ApproveContentInput = z.infer<typeof ApproveContentSchema>
export type RejectContentInput = z.infer<typeof RejectContentSchema>
export type EditContentInput = z.infer<typeof EditContentSchema>
