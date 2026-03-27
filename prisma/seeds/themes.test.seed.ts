/**
 * Seed de Temas para Testes — Inbound Forge
 * Módulo: module-7-theme-scoring-engine (TASK-0/ST004)
 *
 * Cria fixtures com scores controlados: 0, 25, 50, 75, 100
 * Usado em testes de ranking e scoring.
 */
import type { PrismaClient } from '@prisma/client'

export const TEST_THEME_SCORES = [0, 25, 50, 75, 100]

export interface SeededTheme {
  id: string
  title: string
  conversionScore: number
}

export async function seedTestThemes(prisma: PrismaClient): Promise<SeededTheme[]> {
  const themes: SeededTheme[] = []

  for (const score of TEST_THEME_SCORES) {
    const theme = await prisma.theme.create({
      data: {
        title: `Test Theme Score ${score}`,
        conversionScore: score,
        opportunityScore: score,
        painRelevanceScore: score,
        caseStrengthScore: score,
        geoMultiplier: 1.0,
        recencyBonus: score === 0 ? 0.0 : 1.0,
        status: 'ACTIVE',
        isNew: false,
      },
    })
    themes.push({ id: theme.id, title: theme.title, conversionScore: score })
  }

  return themes
}

/**
 * Cria 100 temas com pains e cases mockados para testes de performance.
 */
export async function seedPerformanceThemes(
  prisma: PrismaClient
): Promise<{ themeIds: string[] }> {
  // Criar um case e uma pain de referência para os temas
  const pain = await prisma.painLibraryEntry.create({
    data: {
      title: 'Perf Test Pain',
      description: 'Pain para teste de performance do scoring engine',
      sectors: ['tecnologia'],
      status: 'VALIDATED',
    },
  })

  const caseEntry = await prisma.caseLibraryEntry.create({
    data: {
      name: 'Perf Test Case',
      sector: 'tecnologia',
      systemType: 'SaaS',
      outcome: 'Aumentou 45% a taxa de fechamento em 90 dias, reduzindo o ciclo de vendas de 60 para 33 dias na empresa',
      hasQuantifiableResult: true,
      status: 'VALIDATED',
    },
  })

  const themeIds: string[] = []

  // Criar 100 temas em batch
  const createOps = Array.from({ length: 100 }, (_, i) =>
    prisma.theme.create({
      data: {
        title: `Performance Test Theme ${i + 1}`,
        conversionScore: 0,
        opportunityScore: 0,
        status: 'ACTIVE',
        isNew: false,
        painId: pain.id,
        caseId: caseEntry.id,
      },
    })
  )

  const created = await prisma.$transaction(createOps)
  themeIds.push(...created.map((t) => t.id))

  return { themeIds }
}
