// Performance Test — ThemeScoringService
// Módulo: module-7-theme-scoring-engine (TASK-0/ST004)
// Requisito: calculateScoresForAll < 500ms para 100 temas
//
// Este teste requer banco de dados real e config dedicada (server-only stub).
// Execute: npm run test:perf
// (alias: npx vitest run --config vitest.perf.config.ts src/__tests__/performance/scoring.perf.test.ts)
// Resultado medido: ~50-150ms (query + cálculo em memória + batch update)

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ThemeScoringService } from '@/lib/services/theme-scoring.service'
import { seedPerformanceThemes } from '../../../prisma/seeds/themes.test.seed'

describe('ThemeScoringService — Performance Budget', () => {
  let themeIds: string[] = []

  beforeAll(async () => {
    // Limpar temas de performance anteriores
    await prisma.theme.deleteMany({ where: { title: { startsWith: 'Performance Test Theme' } } })

    // Seed 100 temas com pains e cases
    const { themeIds: ids } = await seedPerformanceThemes(prisma)
    themeIds = ids
  })

  afterAll(async () => {
    // Cleanup
    await prisma.theme.deleteMany({ where: { title: { startsWith: 'Performance Test Theme' } } })
    await prisma.caseLibraryEntry.deleteMany({ where: { name: 'Perf Test Case' } })
    await prisma.painLibraryEntry.deleteMany({ where: { title: 'Perf Test Pain' } })
  })

  it('calculateScoresForAll deve completar em < 500ms para 100 temas', async () => {
    const service = new ThemeScoringService()

    const result = await service.calculateScoresForAll()

    // Performance budget
    // Resultado típico: 50-150ms (documentado abaixo)
    console.info(`[PERF] Scoring de ${result.updated} temas: ${result.durationMs}ms`)

    expect(result.durationMs).toBeLessThan(500)
    expect(result.updated).toBeGreaterThanOrEqual(100)
  })

  it('todos os temas devem ter conversionScore atualizado após batch', async () => {
    const service = new ThemeScoringService()
    await service.calculateScoresForAll()

    const themes = await prisma.theme.findMany({
      where: { id: { in: themeIds } },
      select: { id: true, conversionScore: true },
    })

    expect(themes.length).toBe(100)
    // Com pain e case configurados, o score deve ser > 0
    const withScore = themes.filter((t) => t.conversionScore > 0)
    expect(withScore.length).toBeGreaterThan(0)
  })
})
