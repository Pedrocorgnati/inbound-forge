/**
 * Instagram Pre-Publish Validator.
 * Intake Review TASK-9 ST003 (CL-078).
 *
 * Garante que posts IG atendem as regras da plataforma antes de serem publicados:
 *  - media type suportado (IMAGE / CAROUSEL)
 *  - dimensoes aspect 4:5 (1080x1350) ou 1:1 (1080x1080)
 *  - caption <= 2200 chars
 *  - hashtags <= 30
 *  - rate-limit 25 posts / 24h
 */
import { prisma } from '@/lib/prisma'

export type IgMediaType = 'IMAGE' | 'CAROUSEL' | 'VIDEO' | 'STORY'

export class InstagramValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'InstagramValidationError'
  }
}

export interface IgValidateInput {
  mediaType: IgMediaType
  width: number
  height: number
  caption?: string
  hashtags?: string[]
}

const ALLOWED_DIMENSIONS: Array<{ w: number; h: number }> = [
  { w: 1080, h: 1350 }, // 4:5
  { w: 1080, h: 1080 }, // 1:1
]

export const IG_RATE_LIMIT_PER_DAY = 25

export function validateIg(input: IgValidateInput): void {
  if (!['IMAGE', 'CAROUSEL'].includes(input.mediaType)) {
    throw new InstagramValidationError(
      'IG_MEDIA_TYPE',
      `mediaType ${input.mediaType} nao suportado para feed (use IMAGE ou CAROUSEL)`,
    )
  }

  const allowed = ALLOWED_DIMENSIONS.some((d) => d.w === input.width && d.h === input.height)
  if (!allowed) {
    throw new InstagramValidationError(
      'IG_DIMENSION',
      `dimensao ${input.width}x${input.height} invalida (use 1080x1350 ou 1080x1080)`,
    )
  }

  if (input.caption && input.caption.length > 2200) {
    throw new InstagramValidationError(
      'IG_CAPTION_LENGTH',
      `caption tem ${input.caption.length} chars (limite 2200)`,
    )
  }

  if (input.hashtags && input.hashtags.length > 30) {
    throw new InstagramValidationError(
      'IG_HASHTAG_COUNT',
      `${input.hashtags.length} hashtags (limite 30)`,
    )
  }
}

/**
 * Verifica rate-limit consultando Posts publicados nas ultimas 24h no canal INSTAGRAM.
 */
export async function assertIgRateLimit(now: Date = new Date()): Promise<void> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const count = await prisma.post.count({
    where: {
      channel: 'INSTAGRAM',
      status: 'PUBLISHED',
      publishedAt: { gte: since },
    },
  })
  if (count >= IG_RATE_LIMIT_PER_DAY) {
    throw new InstagramValidationError(
      'IG_RATE_LIMIT',
      `rate-limit atingido (${count}/${IG_RATE_LIMIT_PER_DAY} posts nas ultimas 24h)`,
    )
  }
}

export async function validateIgWithRateLimit(input: IgValidateInput): Promise<void> {
  validateIg(input)
  await assertIgRateLimit()
}
