/**
 * adaptForChannel — Intake-Review TASK-1 ST003 (CL-226)
 * Adapta conteudo (caption, CTA, hashtags) de um canal de origem para
 * um canal destino respeitando os limites/estilo de cada plataforma.
 *
 * Regras pragmaticas:
 * - INSTAGRAM: caption mais curta, tom visual; hashtags limitadas a 30.
 * - LINKEDIN:  caption mais longa, tom profissional; hashtags limitadas a 5.
 * - BLOG:      caption pode ser longa (intro); sem limite pratico de hashtags.
 *
 * Esta funcao faz adaptacao *sintatica* (truncar, reordenar, ajustar CTA).
 * Um operador ainda revisa em DRAFT antes de publicar.
 */
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

export type AdaptChannel = 'INSTAGRAM' | 'LINKEDIN' | 'BLOG'

export interface AdaptInput {
  caption: string
  hashtags: string[]
  ctaText?: string | null
  ctaUrl?: string | null
  sourceChannel: AdaptChannel
}

export interface AdaptResult {
  caption: string
  hashtags: string[]
  ctaText: string | null
  ctaUrl: string | null
}

const CTA_DEFAULTS: Record<AdaptChannel, string> = {
  INSTAGRAM: 'Link na bio',
  LINKEDIN: 'Saiba mais nos comentarios',
  BLOG: 'Continue lendo',
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, Math.max(0, max - 1))
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut
  return `${base}…`
}

export function adaptForChannel(input: AdaptInput, target: AdaptChannel): AdaptResult {
  if (input.sourceChannel === target) {
    return {
      caption: input.caption,
      hashtags: input.hashtags,
      ctaText: input.ctaText ?? null,
      ctaUrl: input.ctaUrl ?? null,
    }
  }

  const cfg = PUBLISHING_CHANNELS[target]

  const caption = truncate(input.caption, cfg.maxCaptionLength)
  const hashtags = input.hashtags.slice(0, cfg.maxHashtags)

  const ctaText = input.ctaText && input.ctaText.trim().length > 0
    ? input.ctaText
    : CTA_DEFAULTS[target]

  return {
    caption,
    hashtags,
    ctaText,
    ctaUrl: input.ctaUrl ?? null,
  }
}
