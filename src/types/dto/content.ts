import { z } from 'zod'
import {
  ContentAngle,
  ContentStatus,
  Channel,
  FunnelStage,
  ThemeStatus,
} from '../enums'

export const ContentPieceCreateSchema = z.object({
  title: z.string().min(1).max(255),
  angle: z.nativeEnum(ContentAngle),
  themeId: z.string().uuid(),
  channel: z.nativeEnum(Channel),
  funnelStage: z.nativeEnum(FunnelStage),
})

export const ContentPieceUpdateSchema = ContentPieceCreateSchema.partial().extend({
  status: z.nativeEnum(ContentStatus).optional(),
})

export const ThemeCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  funnelStage: z.nativeEnum(FunnelStage),
})

export const ThemeUpdateSchema = ThemeCreateSchema.partial().extend({
  status: z.nativeEnum(ThemeStatus).optional(),
})

export type ContentPieceCreateInput = z.infer<typeof ContentPieceCreateSchema>
export type ContentPieceUpdateInput = z.infer<typeof ContentPieceUpdateSchema>
export type ThemeCreateInput = z.infer<typeof ThemeCreateSchema>
export type ThemeUpdateInput = z.infer<typeof ThemeUpdateSchema>
