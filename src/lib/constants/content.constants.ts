import { Channel } from '@/types/enums'

// ─── Channel Character Limits ─────────────────────────────────────────────────

export const CHANNEL_CHAR_LIMITS: Record<Channel, number> = {
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
  BLOG: Infinity,
  TIKTOK: 2200,         // post-MVP CL-064
  YOUTUBE_SHORTS: 100,  // post-MVP CL-065
}

// ─── Content Angles ───────────────────────────────────────────────────────────
// Inbound Forge uses AGGRESSIVE/CONSULTIVE/AUTHORIAL angles

export const CONTENT_ANGLE_LABELS = {
  AGGRESSIVE: 'Agressivo — Amplifica dor e urgência',
  CONSULTIVE: 'Consultivo — Educa e demonstra expertise',
  AUTHORIAL: 'Autoral — Case de sucesso e prova social',
} as const

// ─── E-E-A-T Components ────────────────────────────────────────────────────────

export const EEAT_COMPONENTS = {
  EXPERIENCE: 'experience',
  EXPERTISE: 'expertise',
  AUTHORITATIVENESS: 'authoritativeness',
  TRUSTWORTHINESS: 'trustworthiness',
} as const

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const CONTENT_RATE_LIMITS = {
  ADAPTATIONS_PER_DAY: 5,
  GENERATIONS_PER_HOUR: 10,
} as const

// ─── Claude Model Config ──────────────────────────────────────────────────────

export const CLAUDE_MODELS = {
  ANGLE_GENERATION: 'claude-sonnet-4-6',
  CHANNEL_ADAPTATION: 'claude-haiku-4-5-20251001',
} as const

export const CLAUDE_TIMEOUTS = {
  ANGLE_GENERATION_MS: 30_000,
  CHANNEL_ADAPTATION_MS: 15_000,
} as const

// ─── Score Decay (RN-006) ──────────────────────────────────────────────────────

export const SCORE_DECAY = {
  /** Número de rejeições para acionar o decay */
  REJECTION_THRESHOLD: 3,
  /** Fator multiplicador aplicado a cada ciclo de decay (70% do valor atual) */
  DECAY_MULTIPLIER: 0.7,
  /** Casas decimais para arredondar o score após decay */
  SCORE_PRECISION: 2,
  /** Valor mínimo absoluto do score (nunca negativo) */
  MIN_SCORE: 0,
} as const
