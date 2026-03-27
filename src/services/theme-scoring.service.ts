// ThemeScoringService — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-0/ST003)
// Performance budget: calculateScoresForAll < 500ms para 100 temas

import { prisma } from '@/lib/prisma'
import { calculateFinalScore, calculateScoreBreakdown } from '@/lib/utils/scoring'
import type { BatchScoringResult, ScoreBreakdown } from '@/types/scoring'

export class ThemeScoringService {
  /**
   * Recalcula o score de um tema individual.
   * Retorna o breakdown completo dos componentes.
   * @throws Error com código THEME_080 se tema não encontrado
   */
  async calculateScore(themeId: string): Promise<ScoreBreakdown & { themeId: string }> {
    const theme = await prisma.theme.findUnique({
      where: { id: themeId },
      include: {
        pain: true,
        case: true,
        nicheOpportunity: true,
        contentPieces: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    if (!theme) {
      const err = new Error('Tema não encontrado.')
      ;(err as Error & { code: string }).code = 'THEME_080'
      throw err
    }

    const isGeoReady = theme.nicheOpportunity?.isGeoReady ?? false
    const lastPublishedAt = theme.contentPieces[0]?.createdAt ?? null

    const pains = theme.pain ? [{ relevanceScore: null }] : []
    const cases = theme.case
      ? [{ outcome: theme.case.outcome, hasQuantifiableResult: theme.case.hasQuantifiableResult }]
      : []

    const breakdown = calculateScoreBreakdown({
      pains,
      cases,
      lastPublishedAt,
      isGeoReady,
    })

    await prisma.theme.update({
      where: { id: themeId },
      data: {
        conversionScore: breakdown.finalScore,
        painRelevanceScore: breakdown.painRelevance,
        caseStrengthScore: breakdown.caseStrength,
        geoMultiplier: breakdown.geoMultiplier,
        recencyBonus: breakdown.recencyBonus,
      },
    })

    return { themeId, ...breakdown }
  }

  /**
   * Recalcula scores de todos os temas em batch.
   * Estratégia: 1 query com include, cálculo em memória, batch update em transação.
   * Performance budget: < 500ms para 100 temas.
   */
  async calculateScoresForAll(): Promise<BatchScoringResult> {
    const start = Date.now()

    // 1 query para buscar todos os dados necessários (sem N+1)
    const themes = await prisma.theme.findMany({
      include: {
        pain: { select: { id: true } },
        case: { select: { outcome: true, hasQuantifiableResult: true } },
        nicheOpportunity: { select: { isGeoReady: true } },
        contentPieces: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    if (themes.length === 0) {
      return { updated: 0, durationMs: Date.now() - start }
    }

    // Calcular scores em memória para todos os temas
    const updates = themes.map((theme) => {
      const isGeoReady = theme.nicheOpportunity?.isGeoReady ?? false
      const lastPublishedAt = theme.contentPieces[0]?.createdAt ?? null
      const pains = theme.pain ? [{ relevanceScore: null as number | null }] : []
      const cases = theme.case
        ? [{ outcome: theme.case.outcome, hasQuantifiableResult: theme.case.hasQuantifiableResult }]
        : []

      const score = calculateFinalScore({ pains, cases, lastPublishedAt, isGeoReady })
      const breakdown = calculateScoreBreakdown({ pains, cases, lastPublishedAt, isGeoReady })

      return prisma.theme.update({
        where: { id: theme.id },
        data: {
          conversionScore: score,
          painRelevanceScore: breakdown.painRelevance,
          caseStrengthScore: breakdown.caseStrength,
          geoMultiplier: breakdown.geoMultiplier,
          recencyBonus: breakdown.recencyBonus,
        },
      })
    })

    // Batch update em transação única
    try {
      await prisma.$transaction(updates)
    } catch (err) {
      console.error('[ThemeScoringService] Falha no batch update:', {
        themesCount: themes.length,
        error: err,
      })
      const error = new Error('Falha no batch update de scores.')
      ;(error as Error & { code: string }).code = 'SYS_001'
      throw error
    }

    return { updated: themes.length, durationMs: Date.now() - start }
  }
}

export const themeScoringService = new ThemeScoringService()
