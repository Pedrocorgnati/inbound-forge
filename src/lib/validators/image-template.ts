// module-9: TASK-5 ST001 — Zod validators for ImageTemplate
// Rastreabilidade: TASK-5 ST001, INT-060, API-001

import { z } from 'zod'

const TEMPLATE_TYPES = [
  'CAROUSEL',
  'STATIC_LANDSCAPE',
  'STATIC_PORTRAIT',
  'VIDEO_COVER',
  'BEFORE_AFTER',
  'ERROR_CARD',
  'SOLUTION_CARD',
  'BACKSTAGE_CARD',
] as const

const CHANNELS = ['instagram', 'linkedin', 'blog'] as const

const CHANNEL_DIMENSION_RULES = {
  instagram: [
    { width: 1080, height: 1080 },
    { width: 1080, height: 1350 },
    { width: 1080, height: 1920 },
  ],
  linkedin: [
    { width: 1200, height: 630  },
    { width: 1080, height: 1080 },
  ],
  blog: [
    { width: 1200, height: 630  },
  ],
} as const

function isDimensionsValid(channel: string, widthPx: number, heightPx: number): boolean {
  const rules = CHANNEL_DIMENSION_RULES[channel as keyof typeof CHANNEL_DIMENSION_RULES]
  if (!rules) return false
  return rules.some((d) => d.width === widthPx && d.height === heightPx)
}

export const createTemplateSchema = z.object({
  name:         z.string().min(1).max(100),
  templateType: z.enum(TEMPLATE_TYPES),
  channel:      z.enum(CHANNELS),
  widthPx:      z.number().int().positive(),
  heightPx:     z.number().int().positive(),
  configJson:   z.record(z.unknown()).optional(),
  isActive:     z.boolean().optional().default(true),
}).refine(
  (data) => isDimensionsValid(data.channel, data.widthPx, data.heightPx),
  { message: 'Dimensões inválidas para o canal selecionado', path: ['widthPx'] }
)

export const updateTemplateSchema = z.object({
  name:       z.string().min(1).max(100).optional(),
  configJson: z.record(z.unknown()).optional(),
  isActive:   z.boolean().optional(),
})

export type CreateTemplateDto = z.infer<typeof createTemplateSchema>
export type UpdateTemplateDto = z.infer<typeof updateTemplateSchema>
