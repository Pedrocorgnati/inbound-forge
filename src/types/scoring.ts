// Types do Scoring Engine — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-0/ST002)

export interface ScoringInputs {
  pains: { relevanceScore?: number | null }[]
  cases: { outcome: string; hasQuantifiableResult?: boolean | null }[]
  lastPublishedAt: Date | null
  isGeoReady: boolean
}

export interface ScoreBreakdown {
  painRelevance: number   // 0-100
  caseStrength: number    // 0-100
  recencyBonus: number    // 0.0, 0.5 ou 1.0
  geoMultiplier: number   // 1.0 ou 1.2
  finalScore: number      // 0-100 (resultado final clampado)
  asovBonus?: number      // 0.0–0.15 (TASK-2 ST005)
}

export interface BatchScoringResult {
  updated: number
  durationMs: number
}

export interface ThemeGenerationResult {
  created: number
  updated: number
  skipped: number
  durationMs: number
  throttled?: boolean
  /**
   * TASK-2/ST001 (gap CL-031): indica que o scraping esta unhealthy e o motor
   * operou apenas com pain_library + case_library internas.
   */
  degradedMode?: boolean
  mode?: 'full' | 'internal-only'
}
