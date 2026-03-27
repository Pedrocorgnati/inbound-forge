import { z } from 'zod'
import { Channel, ContentAngle, ContentStatus, FunnelStage, CTADestination } from '@/types/enums'

// ─── Create ──────────────────────────────────────────────────────────────────

export const CreateContentPieceDto = z.object({
  themeId: z.string().uuid('themeId deve ser um UUID válido'),
  funnelStage: z.nativeEnum(FunnelStage).default(FunnelStage.AWARENESS),
  recommendedChannel: z.nativeEnum(Channel).default(Channel.LINKEDIN),
  ctaDestination: z.nativeEnum(CTADestination).default(CTADestination.WHATSAPP),
})

export type CreateContentPieceInput = z.infer<typeof CreateContentPieceDto>

// ─── Generate Angles ─────────────────────────────────────────────────────────

export const GenerateAnglesDto = z.object({
  funnelStage: z.nativeEnum(FunnelStage).optional(),
  forceRegenerate: z.boolean().default(false),
  targetChannel: z.nativeEnum(Channel).optional(),
})

export type GenerateAnglesInput = z.infer<typeof GenerateAnglesDto>

// ─── Update Angle ────────────────────────────────────────────────────────────

export const UpdateAngleDto = z.object({
  editedBody: z.string().optional(),
  isSelected: z.boolean().optional(),
})

export type UpdateAngleInput = z.infer<typeof UpdateAngleDto>

// ─── Approve ─────────────────────────────────────────────────────────────────

export const ApproveContentDto = z.object({
  selectedAngleId: z.string().uuid('selectedAngleId deve ser um UUID válido'),
})

export type ApproveContentInput = z.infer<typeof ApproveContentDto>

// ─── Reject ──────────────────────────────────────────────────────────────────

export const RejectContentDto = z.object({
  reason: z.string().min(10, 'reason deve ter no mínimo 10 caracteres'),
  angle: z.nativeEnum(ContentAngle).optional(),
})

export type RejectContentInput = z.infer<typeof RejectContentDto>

// ─── Adapt ───────────────────────────────────────────────────────────────────

export const AdaptContentDto = z.object({
  angleId: z.string().uuid('angleId deve ser um UUID válido'),
  targetChannel: z.nativeEnum(Channel),
  funnelStage: z.nativeEnum(FunnelStage),
  ctaDestination: z.nativeEnum(CTADestination),
  ctaCustomText: z.string().max(150).optional(),
})

export type AdaptContentInput = z.infer<typeof AdaptContentDto>

// ─── Restore Version ─────────────────────────────────────────────────────────

export const RestoreVersionDto = z.object({
  version: z.number().int().min(1, 'version deve ser um inteiro positivo'),
})

export type RestoreVersionInput = z.infer<typeof RestoreVersionDto>

// ─── Response DTOs ────────────────────────────────────────────────────────────

export const ContentAngleVariantDto = z.object({
  id: z.string(),
  pieceId: z.string(),
  angle: z.nativeEnum(ContentAngle),
  text: z.string(),
  editedBody: z.string().nullable(),
  charCount: z.number(),
  hashtags: z.array(z.string()),
  ctaText: z.string().nullable(),
  recommendedCTA: z.string(),
  suggestedChannel: z.nativeEnum(Channel),
  isSelected: z.boolean(),
  generationVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ContentAngleVariantResponse = z.infer<typeof ContentAngleVariantDto>

export const ContentPieceDto = z.object({
  id: z.string(),
  themeId: z.string(),
  status: z.nativeEnum(ContentStatus),
  funnelStage: z.nativeEnum(FunnelStage),
  recommendedChannel: z.nativeEnum(Channel),
  selectedAngle: z.nativeEnum(ContentAngle).nullable(),
  angles: z.array(ContentAngleVariantDto),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ContentPieceResponse = z.infer<typeof ContentPieceDto>
