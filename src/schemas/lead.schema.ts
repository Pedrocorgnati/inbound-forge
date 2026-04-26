import { z } from 'zod'

export const CreateLeadSchema = z.object({
  firstTouchPostId: z.string().uuid(),
  firstTouchThemeId: z.string().uuid(),
  name: z.string().min(1, 'Nome obrigatório'),
  company: z.string().min(1).max(255).optional(),
  contactInfo: z
    .string()
    .email()
    .or(z.string().regex(/^\+?[\d\s-]{10,}$/, 'Contato deve ser email ou telefone válido'))
    .optional(), // plaintext no input — encryptPII na API
  channel: z.enum(['BLOG', 'LINKEDIN', 'INSTAGRAM']).optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).optional(),
  lgpdConsent: z.boolean().refine((v) => v === true, {
    message: 'Consentimento LGPD obrigatório.',
  }),
  lgpdConsentAt: z.coerce.date().optional(),
  firstTouchAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})

export const UpdateLeadSchema = z.object({
  company: z.string().min(1).max(255).nullable().optional(),
  contactInfo: z.string().min(1).nullable().optional(), // plaintext — re-encryptado na API
  channel: z.enum(['BLOG', 'LINKEDIN', 'INSTAGRAM']).nullable().optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).nullable().optional(),
  status: z.enum(['NEW', 'MQL', 'SQL', 'OPPORTUNITY', 'CUSTOMER', 'LOST']).optional(),
  lossReason: z
    .enum(['BUDGET', 'TIMING', 'FIT', 'NO_RESPONSE', 'COMPETITOR', 'OTHER'])
    .nullable()
    .optional(),
  lossReasonDetail: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  name: z.string().nullable().optional(),
})
  .refine(
    (data) => data.status !== 'LOST' || !!data.lossReason,
    { message: 'lossReason obrigatorio quando status=LOST', path: ['lossReason'] },
  )

export const CreateConversionSchema = z.object({
  type: z.enum(['CONVERSATION', 'MEETING', 'PROPOSAL']),
  occurredAt: z.string().datetime(),
  notes: z.string().nullable().optional(),
})

export const ListLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(['BLOG', 'LINKEDIN', 'INSTAGRAM']).optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'DECISION']).optional(),
  themeId: z.string().uuid().optional(),
  includeContact: z.coerce.boolean().default(false),
  // TASK-11 ST003 (CL-TA-041)
  search: z.string().trim().max(100).optional(),
})

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>
export type CreateConversionInput = z.infer<typeof CreateConversionSchema>
export type ListLeadsInput = z.infer<typeof ListLeadsSchema>
