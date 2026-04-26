/**
 * Image dimensions — fonte canonica replicada do image-worker.
 * Intake Review TASK-3 (CL-065, CL-066).
 *
 * Nao usamos re-export direto do worker porque `workers/**` esta excluido
 * do tsconfig da app Next.js. Aqui duplicamos os tipos/valores, mantendo
 * sincronia via `scripts/check-image-dimensions.sh` (valida que os dois
 * arquivos contem os mesmos pares w/h).
 */

export interface Dimension {
  w: number
  h: number
}

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

export class InvalidDimensionError extends Error {
  constructor(
    public channel: string,
    public expected: ChannelKey[],
    public received: Dimension
  ) {
    const allowed = expected.map((k) => `${TEMPLATE_DIMENSIONS[k].w}x${TEMPLATE_DIMENSIONS[k].h}`).join(', ')
    super(
      `Dimensao ${received.w}x${received.h} nao e permitida para o canal "${channel}". Permitidas: ${allowed || '(nenhuma)'}.`
    )
    this.name = 'InvalidDimensionError'
  }
}

export function isDimensionEqual(a: Dimension, b: Dimension): boolean {
  return a.w === b.w && a.h === b.h
}

export function isDimensionAllowedForChannel(channel: string, dim: Dimension): boolean {
  const allowedKeys = CHANNEL_ALIAS_TO_KEYS[channel.toLowerCase()] ?? []
  return allowedKeys.some((k) => isDimensionEqual(TEMPLATE_DIMENSIONS[k], dim))
}

/**
 * validateDimension
 * - true  -> dimensao valida para o canal (e permitida)
 * - throw -> InvalidDimensionError (nao retorna false para manter retorno tipado
 *   e integracao com o image-pipeline que prefere falhas explicitas).
 */
export function validateDimension(channel: string, dim: Dimension): true {
  const allowedKeys = CHANNEL_ALIAS_TO_KEYS[channel.toLowerCase()] ?? []
  const ok = allowedKeys.some((k) => isDimensionEqual(TEMPLATE_DIMENSIONS[k], dim))
  if (!ok) throw new InvalidDimensionError(channel, allowedKeys, dim)
  return true
}
