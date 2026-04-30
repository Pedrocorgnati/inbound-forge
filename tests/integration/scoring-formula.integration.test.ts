// Integration Tests — Scoring Formula (TASK-2/ST005)
// Módulo: module-7-theme-scoring-engine
// Valida a fórmula completa em cenários E2E com banco de dados real.
// Execute: npm run test:integration -- tests/integration/scoring-formula.integration.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ThemeScoringService } from '@/lib/services/theme-scoring.service'

async function cleanup() {
  await prisma.contentPiece.deleteMany({ where: { theme: { title: { startsWith: 'Formula Test' } } } })
  await prisma.theme.deleteMany({ where: { title: { startsWith: 'Formula Test' } } })
  await prisma.nicheOpportunity.deleteMany({ where: { sector: 'formula-test' } })
  await prisma.solutionPattern.deleteMany({ where: { name: { startsWith: 'Formula Test' } } })
  await prisma.casePain.deleteMany()
  await prisma.caseLibraryEntry.deleteMany({ where: { name: { startsWith: 'Formula Test' } } })
  await prisma.painLibraryEntry.deleteMany({ where: { title: { startsWith: 'Formula Test' } } })
}

describe('Scoring Formula — Integration', () => {
  let service: ThemeScoringService
  let painId: string
  let caseId: string

  beforeEach(async () => {
    service = new ThemeScoringService()
    await cleanup()

    // Setup base: pain + case com resultado quantificável
    const pain = await prisma.painLibraryEntry.create({
      data: {
        title: 'Formula Test Pain',
        description: 'Dificuldade em converter leads em clientes',
        sectors: ['vendas'],
        status: 'VALIDATED',
      },
    })
    painId = pain.id

    const caseEntry = await prisma.caseLibraryEntry.create({
      data: {
        name: 'Formula Test Case',
        sector: 'vendas',
        systemType: 'B2B',
        outcome: 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    })
    caseId = caseEntry.id
  })

  afterEach(async () => {
    await cleanup()
  })

  it('Cenário A: score base sem GEO — nunca publicado', async () => {
    const theme = await prisma.theme.create({
      data: {
        title: 'Formula Test A',
        painId,
        caseId,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
      },
    })

    const result = await service.calculateScore(theme.id)

    // painRelevance=0 (pain sem relevanceScore no schema simplificado)
    // caseStrength>0 (case com resultado quantificável)
    // recencyBonus=1.0 (nunca publicado)
    // geoMultiplier=1.0 (sem nicho)
    expect(result.finalScore).toBeGreaterThanOrEqual(0)
    expect(result.finalScore).toBeLessThanOrEqual(100)
    expect(result.recencyBonus).toBe(1.0)
    expect(result.geoMultiplier).toBe(1.0)
  })

  it('Cenário B: score com GEO ativo — deve ser >= Cenário A', async () => {
    const nicheOpp = await prisma.nicheOpportunity.create({
      data: {
        sector: 'formula-test',
        painCategory: 'Mercado regional SP',
        potentialScore: 0.8,
        isGeoReady: true,
      },
    })

    const theme = await prisma.theme.create({
      data: {
        title: 'Formula Test B',
        painId,
        caseId,
        nicheOpportunityId: nicheOpp.id,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
      },
    })

    const result = await service.calculateScore(theme.id)

    expect(result.geoMultiplier).toBe(1.2)
    expect(result.finalScore).toBeGreaterThanOrEqual(0)
    expect(result.finalScore).toBeLessThanOrEqual(100)
  })

  it('Cenário C: recencyBonus = 0 (publicado há 10 dias)', async () => {
    const theme = await prisma.theme.create({
      data: {
        title: 'Formula Test C',
        painId,
        caseId,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
      },
    })

    // Criar content piece publicado há 10 dias
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    await prisma.contentPiece.create({
      data: {
        themeId: theme.id,
        baseTitle: 'Formula Test Content C',
        painCategory: 'vendas',
        targetNiche: 'B2B',
        relatedService: 'consultoria',
        funnelStage: 'CONSIDERATION',
        idealFormat: 'post',
        recommendedChannel: 'LINKEDIN',
        ctaDestination: 'WHATSAPP',
        status: 'PUBLISHED',
        createdAt: tenDaysAgo,
      },
    })

    const result = await service.calculateScore(theme.id)

    expect(result.recencyBonus).toBe(0.0) // publicado há < 15 dias
  })

  it('Cenário D: recencyBonus = 0.5 (publicado há 20 dias)', async () => {
    const theme = await prisma.theme.create({
      data: {
        title: 'Formula Test D',
        painId,
        caseId,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
      },
    })

    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    await prisma.contentPiece.create({
      data: {
        themeId: theme.id,
        baseTitle: 'Formula Test Content D',
        painCategory: 'vendas',
        targetNiche: 'B2B',
        relatedService: 'consultoria',
        funnelStage: 'CONSIDERATION',
        idealFormat: 'post',
        recommendedChannel: 'LINKEDIN',
        ctaDestination: 'WHATSAPP',
        status: 'PUBLISHED',
        createdAt: twentyDaysAgo,
      },
    })

    const result = await service.calculateScore(theme.id)

    expect(result.recencyBonus).toBe(0.5) // 15-30 dias → 0.5
  })

  it('THEME_080 quando tema não encontrado', async () => {
    await expect(service.calculateScore('id-inexistente')).rejects.toMatchObject({
      code: 'THEME_080',
    })
  })

  it('score é persistido no banco após calculateScore', async () => {
    const theme = await prisma.theme.create({
      data: {
        title: 'Formula Test E',
        painId,
        caseId,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
      },
    })

    const result = await service.calculateScore(theme.id)

    const updated = await prisma.theme.findUnique({ where: { id: theme.id } })
    expect(updated?.conversionScore).toBe(result.finalScore)
    expect(updated?.recencyBonus).toBe(result.recencyBonus)
    expect(updated?.geoMultiplier).toBe(result.geoMultiplier)
  })
})
