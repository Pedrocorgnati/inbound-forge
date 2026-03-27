// Funções Puras de Scoring — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-0/ST002)
// Todas as funções são puras: sem efeitos colaterais, sem I/O

import {
  SCORING_WEIGHTS,
  RECENCY_THRESHOLDS,
  GEO_MULTIPLIERS,
  CASE_QUALITY_WEIGHTS,
} from '@/constants/scoring'
import type { ScoringInputs, ScoreBreakdown } from '@/types/scoring'

// ─── Detecção de resultado quantificável ─────────────────────────────────────
// Regex: detecta número inteiro ou decimal, com ou sem símbolo percentual/multiplicador
const QUANTIFIABLE_RESULT_REGEX = /\d+(\.\d+)?[%xX×]?/

function getCaseWeight(outcome: string, hasQuantifiableResult?: boolean | null): number {
  const isQuantifiable =
    hasQuantifiableResult === true || QUANTIFIABLE_RESULT_REGEX.test(outcome)

  if (isQuantifiable && outcome.length >= 100) {
    return CASE_QUALITY_WEIGHTS.QUANTIFIABLE
  }
  if (outcome.length >= 50) {
    return CASE_QUALITY_WEIGHTS.QUALITATIVE
  }
  return CASE_QUALITY_WEIGHTS.WEAK
}

// ─── Funções públicas de scoring ─────────────────────────────────────────────

/**
 * Calcula a relevância de dores para um tema.
 * Retorna a média dos relevanceScore das dores vinculadas.
 * Se nenhuma dor vinculada, retorna 0.
 */
export function calculatePainRelevance(
  pains: { relevanceScore?: number | null }[]
): number {
  if (pains.length === 0) return 0

  const scores = pains
    .map((p) => p.relevanceScore ?? 0)
    .filter((s) => typeof s === 'number')

  if (scores.length === 0) return 0
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
  return Math.round(avg)
}

/**
 * Calcula a força dos cases vinculados ao tema.
 * Pesos por qualidade do resultado: quantificável=1.0, qualitativo=0.7, fraco=0.3.
 * Retorna score 0-100.
 */
export function calculateCaseStrength(
  cases: { outcome: string; hasQuantifiableResult?: boolean | null }[]
): number {
  if (cases.length === 0) return 0

  const totalWeight = cases.reduce((sum, c) => sum + getCaseWeight(c.outcome, c.hasQuantifiableResult), 0)
  const avgWeight = totalWeight / cases.length

  // Normaliza para 0-100: peso máximo (1.0) = 100, peso mínimo (0.3) = 30
  return Math.round(avgWeight * 100)
}

/**
 * Calcula o bônus de recência com base na data do último conteúdo publicado.
 * null = nunca publicado → 1.0
 * > 30 dias atrás → 1.0
 * 15-30 dias atrás → 0.5
 * < 15 dias atrás → 0.0
 */
export function calculateRecencyBonus(lastPublishedAt: Date | null): number {
  if (!lastPublishedAt) return 1.0

  const now = Date.now()
  const diffMs = now - lastPublishedAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays >= RECENCY_THRESHOLDS.FULL_BONUS) return 1.0
  if (diffDays >= RECENCY_THRESHOLDS.HALF_BONUS) return 0.5
  return 0.0
}

/**
 * Retorna o multiplicador GEO.
 * isGeoReady = true → 1.2, senão → 1.0
 */
export function calculateGeoMultiplier(isGeoReady: boolean): number {
  return isGeoReady ? GEO_MULTIPLIERS.GEO_BONUS : GEO_MULTIPLIERS.DEFAULT
}

/**
 * Calcula o score final usando a fórmula completa.
 * score = (painRelevance*0.40 + caseStrength*0.35 + recencyBonus*0.25) * geoMultiplier
 * Resultado: Int 0-100 (clampado, nunca NaN ou Infinity)
 */
export function calculateFinalScore(inputs: ScoringInputs): number {
  const painRelevance = calculatePainRelevance(inputs.pains)
  const caseStrength = calculateCaseStrength(inputs.cases)
  const recencyBonus = calculateRecencyBonus(inputs.lastPublishedAt)
  const geoMultiplier = calculateGeoMultiplier(inputs.isGeoReady)

  const rawScore =
    (painRelevance * SCORING_WEIGHTS.PAIN_RELEVANCE +
      caseStrength * SCORING_WEIGHTS.CASE_STRENGTH +
      recencyBonus * 100 * SCORING_WEIGHTS.RECENCY_BONUS) *
    geoMultiplier

  // Guard: NaN/Infinity → 0
  if (!isFinite(rawScore) || isNaN(rawScore)) return 0
  return Math.max(0, Math.min(100, Math.round(rawScore)))
}

/**
 * Calcula o score e retorna o breakdown completo para debug/API response.
 */
export function calculateScoreBreakdown(inputs: ScoringInputs): ScoreBreakdown {
  const painRelevance = calculatePainRelevance(inputs.pains)
  const caseStrength = calculateCaseStrength(inputs.cases)
  const recencyBonus = calculateRecencyBonus(inputs.lastPublishedAt)
  const geoMultiplier = calculateGeoMultiplier(inputs.isGeoReady)

  const rawScore =
    (painRelevance * SCORING_WEIGHTS.PAIN_RELEVANCE +
      caseStrength * SCORING_WEIGHTS.CASE_STRENGTH +
      recencyBonus * 100 * SCORING_WEIGHTS.RECENCY_BONUS) *
    geoMultiplier

  const finalScore = isFinite(rawScore) && !isNaN(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 0

  return { painRelevance, caseStrength, recencyBonus, geoMultiplier, finalScore }
}
