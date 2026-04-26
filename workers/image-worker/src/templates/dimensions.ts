/**
 * Template dimensions — Intake Review TASK-3 (CL-065, CL-066)
 *
 * Fonte unica das dimensoes oficiais dos templates de arte. Usada pelos
 * templates do image-worker (satori width/height) e pelo channel guard do
 * image-pipeline no lado do Next.js (re-export em `src/lib/image-dimensions.ts`).
 */

export interface Dimension {
  w: number
  h: number
}

/**
 * Presets oficiais por canal de publicacao.
 * - OG_BLOG 1200x630: Open Graph, blog cover, LinkedIn link preview.
 * - INSTAGRAM_FEED 1080x1350: portrait 4:5 (melhor crop no feed).
 * - INSTAGRAM_SQUARE 1080x1080: carousel e fallback quadrado.
 * - INSTAGRAM_REEL 1080x1920: 9:16 para Reels/Stories.
 * - TWITTER_OG 1200x630: mesma proporcao do OG padrao.
 * - LINKEDIN_OG 1200x627: tecnicamente 1200x627 mas OG_BLOG e aceito.
 * - VIDEO_COVER 1080x1080: thumbnail square para videos.
 * - BACKSTAGE 1080x1080: frame bastidor/meta.
 */
export const TEMPLATE_DIMENSIONS = {
  OG_BLOG: { w: 1200, h: 630 },
  INSTAGRAM_FEED: { w: 1080, h: 1350 },
  INSTAGRAM_SQUARE: { w: 1080, h: 1080 },
  INSTAGRAM_REEL: { w: 1080, h: 1920 },
  TWITTER_OG: { w: 1200, h: 630 },
  LINKEDIN_OG: { w: 1200, h: 627 },
  VIDEO_COVER: { w: 1080, h: 1080 },
  BACKSTAGE: { w: 1080, h: 1080 },
} as const satisfies Record<string, Dimension>

export type ChannelKey = keyof typeof TEMPLATE_DIMENSIONS

/**
 * Mapa dos TemplateTypes do ImageJob para a dimensao oficial do canal.
 * Mantem o image-worker e o image-pipeline alinhados na fonte unica.
 */
export const TEMPLATE_TYPE_TO_DIMENSION = {
  CAROUSEL: TEMPLATE_DIMENSIONS.INSTAGRAM_SQUARE,
  STATIC_LANDSCAPE: TEMPLATE_DIMENSIONS.OG_BLOG,
  STATIC_PORTRAIT: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED,
  VIDEO_COVER: TEMPLATE_DIMENSIONS.VIDEO_COVER,
  BEFORE_AFTER: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED,
  ERROR_CARD: TEMPLATE_DIMENSIONS.INSTAGRAM_FEED,
  SOLUTION_CARD: TEMPLATE_DIMENSIONS.OG_BLOG,
  BACKSTAGE_CARD: TEMPLATE_DIMENSIONS.BACKSTAGE,
} as const

export type SupportedTemplateType = keyof typeof TEMPLATE_TYPE_TO_DIMENSION

/**
 * Alias usado pelo image-pipeline para validar dimensao requisitada por canal
 * logico (instagram, blog, linkedin...). Mapeia aliases humanos -> presets.
 */
export const CHANNEL_ALIAS_TO_KEYS: Record<string, ChannelKey[]> = {
  blog: ['OG_BLOG', 'TWITTER_OG', 'LINKEDIN_OG'],
  og: ['OG_BLOG', 'TWITTER_OG', 'LINKEDIN_OG'],
  twitter: ['TWITTER_OG'],
  linkedin: ['LINKEDIN_OG', 'OG_BLOG'],
  instagram: ['INSTAGRAM_FEED', 'INSTAGRAM_SQUARE', 'INSTAGRAM_REEL'],
  'instagram-reel': ['INSTAGRAM_REEL'],
  'instagram-square': ['INSTAGRAM_SQUARE'],
  'instagram-feed': ['INSTAGRAM_FEED'],
  video: ['VIDEO_COVER'],
}

export function getDimensionForTemplate(
  templateType: SupportedTemplateType
): Dimension {
  return TEMPLATE_TYPE_TO_DIMENSION[templateType]
}

export function isDimensionEqual(a: Dimension, b: Dimension): boolean {
  return a.w === b.w && a.h === b.h
}

export function isDimensionAllowedForChannel(
  channel: string,
  dim: Dimension
): boolean {
  const allowedKeys = CHANNEL_ALIAS_TO_KEYS[channel.toLowerCase()] ?? []
  return allowedKeys.some((k) => isDimensionEqual(TEMPLATE_DIMENSIONS[k], dim))
}
