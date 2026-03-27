// module-9: Worker constants (re-export from shared + worker-specific)
// Mantidos separados do src/lib/constants do Next.js para não criar deps circulares

import type { TemplateType } from './types'

export type ImageProvider = 'ideogram' | 'flux' | 'static'

export const IMAGE_DIMENSIONS: Record<TemplateType, { widthPx: number; heightPx: number }> = {
  CAROUSEL:          { widthPx: 1080, heightPx: 1080 },
  STATIC_LANDSCAPE:  { widthPx: 1200, heightPx: 630  },
  STATIC_PORTRAIT:   { widthPx: 1080, heightPx: 1350 },
  VIDEO_COVER:       { widthPx: 1080, heightPx: 1080 },
  BEFORE_AFTER:      { widthPx: 1080, heightPx: 1350 },
  ERROR_CARD:        { widthPx: 1080, heightPx: 1350 },
  SOLUTION_CARD:     { widthPx: 1200, heightPx: 630  },
  BACKSTAGE_CARD:    { widthPx: 1080, heightPx: 1080 },
} as const

export const IMAGE_WORKER_CONFIG = {
  maxRetries:          3,
  timeoutMs:           60_000,
  deadLetterAfter:     3,
  pollingIntervalMs:   3_000,
  heartbeatIntervalMs: 30_000,
  blpopTimeoutSec:     5,
  costLogMaxEntries:   100,
} as const

export const IMAGE_PROVIDERS: Record<ImageProvider, { costUsd: number }> = {
  ideogram: { costUsd: 0.04  },
  flux:     { costUsd: 0.015 },
  static:   { costUsd: 0.00  },
} as const

export const TEMPLATE_PROVIDER_MAP: Record<TemplateType, ImageProvider> = {
  ERROR_CARD:       'ideogram',
  SOLUTION_CARD:    'ideogram',
  BEFORE_AFTER:     'ideogram',
  BACKSTAGE_CARD:   'ideogram',
  CAROUSEL:         'flux',
  STATIC_LANDSCAPE: 'flux',
  STATIC_PORTRAIT:  'flux',
  VIDEO_COVER:      'flux',
} as const

// Chave consistente com src/lib/redis.ts (QUEUE_KEYS.image)
export const REDIS_QUEUE_KEY      = 'worker:image:queue'      as const
export const REDIS_DEAD_LETTER_KEY = 'worker:image:dead-letter' as const

export const RETRY_BACKOFF_MS: readonly number[] = [5_000, 15_000, 30_000] as const

export const BRAND_COLOR_DEFAULT = '#4F46E5' as const
