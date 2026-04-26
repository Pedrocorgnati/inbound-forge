// ThemeScoringService — Inbound Forge
// Módulo: module-7-theme-scoring-engine (TASK-0/ST003)
// Performance budget: calculateScoresForAll < 500ms para 100 temas
// CL-071: conversionBonus conecta dados de analytics ao scoring

import { prisma } from '@/lib/prisma'
import { calculateFinalScore, calculateScoreBreakdown } from '@/lib/utils/scoring'
import type { BatchScoringResult, ScoreBreakdown } from '@/types/scoring'
import { captureException } from '@/lib/sentry'
import { asovRate } from '@/lib/services/asov.service'
import { calculateGeoBonus } from '@/lib/seo/geo-bonus'
import { getScoringPhase } from '@/lib/services/ltr-threshold.service'

const ASOV_BONUS_MAX = 0.15
const ASOV_BONUS_ENABLED = process.env.ASOV_BONUS_ENABLED !== 'false'

// Bônus/penalidade de conversão aplicado como multiplicador no score final
function conversionMultiplier(conversions: number, publishedPosts: number): number {
  if (conversions > 3) return 1.20   // +20%
  if (conversions > 0) return 1.10   // +10%
  if (publishedPosts >= 5 && conversions === 0) return 0.95  // -5%
  return 1.0
}

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
        pain: { select: { relevanceScore: true } },
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

    const pains = theme.pain ? [{ relevanceScore: theme.pain.relevanceScore }] : []
    const cases = theme.case
      ? [{ outcome: theme.case.outcome, hasQuantifiableResult: theme.case.hasQuantifiableResult }]
      : []

    const breakdown = calculateScoreBreakdown({
      pains,
      cases,
      lastPublishedAt,
      isGeoReady,
    })

    let asovBonus = 0
    if (ASOV_BONUS_ENABLED) {
      try {
        const rate = await asovRate(themeId, 30)
        asovBonus = Math.min(ASOV_BONUS_MAX, ASOV_BONUS_MAX * rate)
      } catch {
        asovBonus = 0
      }
    }

    // TASK-3/ST002 (CL-126): bonus GEO aplicado sobre o score com ASOV
    const geoBonus = calculateGeoBonus({ title: theme.title })

    // Intake Review TASK-6 ST002 (CL-098) — Historical conversion rate boost
    // quando fase global e POST_LTR (>=50 posts + >=10 conversoes).
    const phase = await getScoringPhase().catch(() => null)
    let historicalConversionRate = 0
    if (phase?.phase === 'POST_LTR') {
      const [publishedCount, conversionCount] = await Promise.all([
        prisma.post.count({ where: { themeId, status: 'PUBLISHED' } }),
        prisma.conversionEvent.count({ where: { lead: { firstTouchThemeId: themeId } } }),
      ])
      historicalConversionRate = publishedCount > 0 ? conversionCount / publishedCount : 0
    }
    const ltrMultiplier = 1 + Math.min(0.25, historicalConversionRate)

    const finalScoreWithAsov = Math.round(
      breakdown.finalScore * (1 + asovBonus) * (1 + geoBonus.totalBonus) * ltrMultiplier,
    )

    await prisma.theme.update({
      where: { id: themeId },
      data: {
        conversionScore: finalScoreWithAsov,
        painRelevanceScore: breakdown.painRelevance,
        caseStrengthScore: breakdown.caseStrength,
        geoMultiplier: breakdown.geoMultiplier,
        recencyBonus: breakdown.recencyBonus,
        scoreBreakdown: {
          painRelevance: breakdown.painRelevance,
          caseStrength: breakdown.caseStrength,
          geoMultiplier: breakdown.geoMultiplier,
          recencyBonus: breakdown.recencyBonus,
          asovBonus,
          geoBonus,
          ltrPhase: phase?.phase ?? 'PRE_LTR',
          historicalConversionRate,
          ltrMultiplier,
          finalScore: finalScoreWithAsov,
          computedAt: new Date().toISOString(),
        } as never,
      },
    })

    return { themeId, ...breakdown, finalScore: finalScoreWithAsov, asovBonus }
  }

  /**
   * Recalcula scores de todos os temas em batch.
   * Estratégia: 1 query com include, cálculo em memória, batch update em transação.
   * Performance budget: < 500ms para 100 temas.
   */
  async calculateScoresForAll(conversionsByTheme?: Record<string, number>): Promise<BatchScoringResult> {
    const start = Date.now()

    // 1 query para buscar todos os dados necessários (sem N+1)
    const themes = await prisma.theme.findMany({
      include: {
        pain: { select: { id: true, relevanceScore: true } },
        case: { select: { outcome: true, hasQuantifiableResult: true } },
        nicheOpportunity: { select: { isGeoReady: true } },
        contentPieces: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        _count: { select: { contentPieces: { where: { status: 'PUBLISHED' } } } },
      },
    })

    if (themes.length === 0) {
      return { updated: 0, durationMs: Date.now() - start }
    }

    // Calcular scores em memória para todos os temas
    const updates = themes.map((theme) => {
      const isGeoReady = theme.nicheOpportunity?.isGeoReady ?? false
      const lastPublishedAt = theme.contentPieces[0]?.createdAt ?? null
      const pains = theme.pain ? [{ relevanceScore: theme.pain.relevanceScore }] : []
      const cases = theme.case
        ? [{ outcome: theme.case.outcome, hasQuantifiableResult: theme.case.hasQuantifiableResult }]
        : []

      const baseScore = calculateFinalScore({ pains, cases, lastPublishedAt, isGeoReady })
      const breakdown = calculateScoreBreakdown({ pains, cases, lastPublishedAt, isGeoReady })

      // CL-071: aplicar bônus/penalidade de conversão
      const conversions = conversionsByTheme?.[theme.id] ?? 0
      const publishedPosts = theme._count.contentPieces
      const multiplier = conversionMultiplier(conversions, publishedPosts)
      const finalScore = Math.min(1, baseScore * multiplier)

      return prisma.theme.update({
        where: { id: theme.id },
        data: {
          conversionScore: finalScore,
          painRelevanceScore: breakdown.painRelevance,
          caseStrengthScore: breakdown.caseStrength,
          geoMultiplier: breakdown.geoMultiplier,
          recencyBonus: breakdown.recencyBonus,
          scoreBreakdown: {
            painRelevance: breakdown.painRelevance,
            caseStrength: breakdown.caseStrength,
            geoMultiplier: breakdown.geoMultiplier,
            recencyBonus: breakdown.recencyBonus,
            conversionMultiplier: multiplier,
            baseScore,
            finalScore,
            computedAt: new Date().toISOString(),
          } as never,
        },
      })
    })

    // Batch update em transação única
    try {
      await prisma.$transaction(updates)
    } catch (err) {
      captureException(err, { service: 'ThemeScoringService', step: 'batch-update', themesCount: themes.length })
      const error = new Error('Falha no batch update de scores.')
      ;(error as Error & { code: string }).code = 'SYS_001'
      throw error
    }

    return { updated: themes.length, durationMs: Date.now() - start }
  }
}

export const themeScoringService = new ThemeScoringService()
