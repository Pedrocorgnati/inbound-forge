// module-9: Image Worker Constants
// Rastreabilidade: INT-058, INT-059, FEAT-creative-generation-002
// Zero magic numbers — sempre importar estas constantes

import type { TemplateType } from '@/types/image-template'
import type { ImageDimensions, ImageProvider } from '@/types/image-worker'

// ─── Dimensões por Template Type ─────────────────────────────────────────────

export const IMAGE_DIMENSIONS: Record<TemplateType, Omit<ImageDimensions, 'channel'>> = {
  CAROUSEL:          { widthPx: 1080, heightPx: 1080 },
  STATIC_LANDSCAPE:  { widthPx: 1200, heightPx: 630  },
  STATIC_PORTRAIT:   { widthPx: 1080, heightPx: 1350 },
  VIDEO_COVER:       { widthPx: 1080, heightPx: 1080 },
  BEFORE_AFTER:      { widthPx: 1080, heightPx: 1350 },
  ERROR_CARD:        { widthPx: 1080, heightPx: 1350 },
  SOLUTION_CARD:     { widthPx: 1200, heightPx: 630  },
  BACKSTAGE_CARD:    { widthPx: 1080, heightPx: 1080 },
} as const

// ─── Worker Config ────────────────────────────────────────────────────────────

export const IMAGE_WORKER_CONFIG = {
  maxRetries:          3,
  timeoutMs:           60_000,
  deadLetterAfter:     3,
  pollingIntervalMs:   3_000,
  heartbeatIntervalMs: 30_000,
  blpopTimeoutSec:     5,
  costLogMaxEntries:   100,
} as const

// Limite diário de gerações por usuário — IMAGE_051
export const IMAGE_DAILY_LIMIT = 50

// ─── Providers ────────────────────────────────────────────────────────────────

export const IMAGE_PROVIDERS: Record<ImageProvider, { costUsd: number; label: string; useCase: string }> = {
  ideogram: {
    costUsd:  0.04,
    label:    'Ideogram',
    useCase:  'Templates com texto dominante (ERROR_CARD, SOLUTION_CARD, BEFORE_AFTER, BACKSTAGE_CARD)',
  },
  flux: {
    costUsd:  0.015,
    label:    'Fal.ai Flux',
    useCase:  'Templates com visuais abstratos/fundos (CAROUSEL, STATIC_*, VIDEO_COVER)',
  },
  static: {
    costUsd:  0.00,
    label:    'Estático',
    useCase:  'Fallback de último recurso — fundo sólido da cor da marca',
  },
} as const

// ─── Seleção de Provider por Template ────────────────────────────────────────

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

// ─── Redis Keys ───────────────────────────────────────────────────────────────
import { REDIS_KEYS } from '@/constants/redis-keys'

export const REDIS_QUEUE_KEY = REDIS_KEYS.IMAGE_QUEUE
export const REDIS_DEAD_LETTER_KEY = 'worker:image:dead-letter' as const

/** Template de chave por job UUID: usar `REDIS_JOB_KEY_TPL.replace('{uuid}', jobId)` */
export const REDIS_JOB_KEY_TPL = 'image:{uuid}' as const

// ─── Backoff Exponencial ──────────────────────────────────────────────────────

/** Delays em ms para cada tentativa de retry (índice = retryCount - 1) */
export const RETRY_BACKOFF_MS: readonly number[] = [5_000, 15_000, 30_000] as const

// ─── Cor Padrão da Marca ──────────────────────────────────────────────────────

export const BRAND_COLOR_DEFAULT = '#4F46E5' as const
