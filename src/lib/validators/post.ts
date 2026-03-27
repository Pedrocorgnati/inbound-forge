/**
 * Validators para Post — module-12-calendar-publishing
 * INT-065 | INT-066 | QUAL-005
 * Validação condicional por canal (Instagram/LinkedIn têm limites diferentes).
 */
import { z } from 'zod'
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

const ALLOWED_CHANNELS = ['INSTAGRAM', 'LINKEDIN', 'BLOG'] as const

export const createPostSchema = z
  .object({
    channel: z.enum(ALLOWED_CHANNELS, {
      errorMap: () => ({ message: 'Canal deve ser INSTAGRAM, LINKEDIN ou BLOG' }),
    }),
    caption: z.string().min(10, 'Caption deve ter no mínimo 10 caracteres'),
    hashtags: z.array(z.string()).default([]),
    ctaText: z.string().optional(),
    ctaUrl: z.string().url('URL do CTA inválida').optional().or(z.literal('')),
    imageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
    scheduledAt: z.string().datetime().optional(),
    contentPieceId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const channelConfig = PUBLISHING_CHANNELS[data.channel]
    if (!channelConfig) return

    // Validação POST_020: caption acima do limite do canal
    if (data.caption.length > channelConfig.maxCaptionLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: JSON.stringify({
          code: 'POST_020',
          field: 'caption',
          limit: channelConfig.maxCaptionLength,
          received: data.caption.length,
        }),
        path: ['caption'],
      })
    }

    // Validação POST_021: hashtags acima do limite do canal
    if (data.hashtags && data.hashtags.length > channelConfig.maxHashtags) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: JSON.stringify({
          code: 'POST_021',
          field: 'hashtags',
          limit: channelConfig.maxHashtags,
          received: data.hashtags.length,
        }),
        path: ['hashtags'],
      })
    }
  })

export const updatePostSchema = z
  .object({
    caption: z.string().min(10).optional(),
    hashtags: z.array(z.string()).optional(),
    ctaText: z.string().optional(),
    ctaUrl: z.string().url().optional().or(z.literal('')),
    imageUrl: z.string().url().optional().or(z.literal('')),
    scheduledAt: z.string().datetime().optional(),
    channel: z.enum(ALLOWED_CHANNELS).optional(),
  })

export const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime('Data de agendamento inválida'),
})

export const fromContentSchema = z.object({
  contentPieceId: z.string().min(1, 'contentPieceId obrigatório'),
  channel: z.enum(ALLOWED_CHANNELS),
})

export const listPostsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(ALLOWED_CHANNELS).optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'FAILED', 'PENDING_ART']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type SchedulePostInput = z.infer<typeof schedulePostSchema>
export type FromContentInput = z.infer<typeof fromContentSchema>
export type ListPostsInput = z.infer<typeof listPostsSchema>
