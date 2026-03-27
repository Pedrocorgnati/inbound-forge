import { z } from 'zod'
import { FunnelStage, Channel, AttributionType } from '../enums'

// SEGURANÇA: contactInfo NÃO é parte deste DTO.
// PII é criptografado via PIIEncryptionService (module-2/TASK-4) antes de persistir.
// Nunca adicionar email, telefone ou nome completo como campo direto neste schema.
export const LeadCreateSchema = z.object({
  source: z.string().min(1),
  funnelStage: z.nativeEnum(FunnelStage),
  channel: z.nativeEnum(Channel).optional(),
  attributionType: z.nativeEnum(AttributionType).optional(),
  utmData: z
    .object({
      source: z.string(),
      medium: z.string(),
      campaign: z.string(),
      term: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
})

export type LeadCreateInput = z.infer<typeof LeadCreateSchema>
