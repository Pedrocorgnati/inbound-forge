// Constantes de Scoring — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-0/ST002)
// fórmula: score = (painRelevance*0.40 + caseStrength*0.35 + recencyBonus*0.25) * geoMultiplier

export const SCORING_WEIGHTS = {
  PAIN_RELEVANCE: 0.40,
  CASE_STRENGTH: 0.35,
  RECENCY_BONUS: 0.25,
} as const

// Thresholds de recência em dias
export const RECENCY_THRESHOLDS = {
  // Se lastPublishedAt > FULL_BONUS dias atrás (ou nunca publicado): bonus = 1.0
  FULL_BONUS: 30,
  // Se lastPublishedAt entre HALF_BONUS e FULL_BONUS dias atrás: bonus = 0.5
  HALF_BONUS: 15,
  // Se lastPublishedAt < HALF_BONUS dias atrás: bonus = 0.0
} as const

// Multiplicadores GEO
export const GEO_MULTIPLIERS = {
  DEFAULT: 1.0,
  GEO_BONUS: 1.2,
} as const

// Pesos por qualidade do resultado de case
export const CASE_QUALITY_WEIGHTS = {
  // result com número quantificável (regex) + comprimento >= 100: peso 1.0
  QUANTIFIABLE: 1.0,
  // result qualitativo (50 <= chars < 100): peso 0.7
  QUALITATIVE: 0.7,
  // result insuficiente (< 50 chars ou sem dado): peso 0.3
  WEAK: 0.3,
} as const

// Score mínimo para exibição no dashboard
export const SCORE_DISPLAY_THRESHOLD = 0
