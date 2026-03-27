/**
 * Channel Adapter — module-12-calendar-publishing
 * Adapta conteúdo de ContentPiece para cada canal (Instagram/LinkedIn).
 * Sem IA — apenas truncação, formatação e limitação de hashtags.
 * INT-065 | INT-066 | CX-03
 */
import { PUBLISHING_CHANNELS } from '@/lib/constants/publishing'

export interface ChannelAdaptInput {
  body: string
  tags: string[]
  imageUrl?: string
  ctaText?: string
  ctaUrl?: string
}

export interface ChannelAdaptation {
  caption: string
  hashtags: string[]
  imageUrl?: string
  ctaText?: string
  ctaUrl?: string
}

/**
 * Calcula o comprimento total que os hashtags vão ocupar (incluindo espaços).
 */
function hashtagsLength(hashtags: string[]): number {
  if (hashtags.length === 0) return 0
  return hashtags.join(' ').length + 1 // +1 para \n de separação
}

/**
 * Trunca texto em maxLength sem cortar palavras no meio.
 */
export function truncateCaption(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 0) return truncated.slice(0, lastSpace) + '...'
  return truncated.slice(0, maxLength - 3) + '...'
}

/**
 * Adapta para Instagram:
 * - Caption máx 2200 chars (reservando espaço para hashtags)
 * - Máx 30 hashtags ao final
 * - #hashtag formatado (remove espaços)
 */
export function adaptForInstagram(input: ChannelAdaptInput): ChannelAdaptation {
  const maxHashtags = PUBLISHING_CHANNELS.INSTAGRAM.maxHashtags
  const maxCaption = PUBLISHING_CHANNELS.INSTAGRAM.maxCaptionLength

  const hashtags = (input.tags ?? [])
    .slice(0, maxHashtags)
    .map((t) => `#${t.replace(/\s+/g, '')}`)

  const reservedForHashtags = hashtagsLength(hashtags)
  const captionLimit = maxCaption - reservedForHashtags

  return {
    caption: truncateCaption(input.body, captionLimit),
    hashtags,
    imageUrl: input.imageUrl,
    ctaText: input.ctaText,
    ctaUrl: input.ctaUrl,
  }
}

/**
 * Adapta para LinkedIn:
 * - Caption máx 3000 chars (tom profissional)
 * - Máx 5 hashtags
 */
export function adaptForLinkedIn(input: ChannelAdaptInput): ChannelAdaptation {
  const maxHashtags = PUBLISHING_CHANNELS.LINKEDIN.maxHashtags
  const maxCaption = PUBLISHING_CHANNELS.LINKEDIN.maxCaptionLength

  const hashtags = (input.tags ?? [])
    .slice(0, maxHashtags)
    .map((t) => `#${t.replace(/\s+/g, '')}`)

  const reservedForHashtags = hashtagsLength(hashtags)
  const captionLimit = maxCaption - reservedForHashtags

  return {
    caption: truncateCaption(input.body, captionLimit),
    hashtags,
    imageUrl: input.imageUrl,
    ctaText: input.ctaText,
    ctaUrl: input.ctaUrl,
  }
}

/**
 * Dispatcher — adapta para o canal indicado.
 */
export function adaptForChannel(
  input: ChannelAdaptInput,
  channel: string
): ChannelAdaptation {
  switch (channel.toUpperCase()) {
    case 'INSTAGRAM':
      return adaptForInstagram(input)
    case 'LINKEDIN':
      return adaptForLinkedIn(input)
    default:
      return {
        caption: truncateCaption(input.body, 2000),
        hashtags: input.tags?.slice(0, 10).map((t) => `#${t}`) ?? [],
        imageUrl: input.imageUrl,
        ctaText: input.ctaText,
        ctaUrl: input.ctaUrl,
      }
  }
}
