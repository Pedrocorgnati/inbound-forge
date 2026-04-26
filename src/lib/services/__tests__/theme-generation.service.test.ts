// Tests — ThemeGenerationService
// Módulo: module-7-theme-scoring-engine (TASK-1/ST001)
// Requer banco de dados real para testes de integração.
// Execute: npx vitest run src/services/__tests__/theme-generation.service.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { ThemeGenerationService } from '../theme-generation.service'

async function cleanupTestData() {
  await prisma.theme.deleteMany({ where: { title: { contains: 'Test Gen' } } })
  await prisma.solutionPattern.deleteMany({ where: { name: { contains: 'Test Gen' } } })
  await prisma.casePain.deleteMany()
  await prisma.caseLibraryEntry.deleteMany({ where: { name: { contains: 'Test Gen' } } })
  await prisma.painLibraryEntry.deleteMany({ where: { title: { contains: 'Test Gen' } } })
}

describe('ThemeGenerationService', () => {
  let service: ThemeGenerationService

  beforeEach(async () => {
    service = new ThemeGenerationService()
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('retorna { created:0, updated:0, skipped:0 } quando não há cases validados', async () => {
    const result = await service.generate()
    expect(result.created).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.skipped).toBe(0)
  })

  it('retorna { created:0 } quando há cases mas sem solution patterns', async () => {
    const pain = await prisma.painLibraryEntry.create({
      data: {
        title: 'Test Gen Pain A',
        description: 'Dor sem solution pattern',
        sectors: ['tecnologia'],
        status: 'VALIDATED',
      },
    })
    const caseEntry = await prisma.caseLibraryEntry.create({
      data: {
        name: 'Test Gen Case A',
        sector: 'tecnologia',
        systemType: 'SaaS',
        outcome: 'Resultado de teste',
        status: 'VALIDATED',
      },
    })
    await prisma.casePain.create({ data: { caseId: caseEntry.id, painId: pain.id } })
    // SEM solution pattern para esta dor

    const result = await service.generate()
    expect(result.created).toBe(0)
  })

  it('gera temas para combinações válidas pain + case + pattern', async () => {
    const pain = await prisma.painLibraryEntry.create({
      data: {
        title: 'Test Gen Pain B',
        description: 'Dificuldade em converter leads em clientes no funil de vendas',
        sectors: ['vendas'],
        status: 'VALIDATED',
      },
    })
    const caseEntry = await prisma.caseLibraryEntry.create({
      data: {
        name: 'Test Gen Case B',
        sector: 'vendas',
        systemType: 'B2B',
        outcome: 'Aumentou 45% a taxa de conversão em 90 dias com automação de follow-up',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    })
    await prisma.casePain.create({ data: { caseId: caseEntry.id, painId: pain.id } })
    await prisma.solutionPattern.create({
      data: {
        name: 'Test Gen Pattern B',
        description: 'Automatizar follow-up com sequência de emails',
        painId: pain.id,
        caseId: caseEntry.id,
      },
    })

    const result = await service.generate()

    expect(result.created).toBeGreaterThan(0)
    const theme = await prisma.theme.findFirst({ where: { painId: pain.id, caseId: caseEntry.id } })
    expect(theme).toBeTruthy()
    expect(theme?.conversionScore).toBeGreaterThanOrEqual(0)
  })

  it('segunda chamada sem forceRegenerate não cria duplicatas', async () => {
    const pain = await prisma.painLibraryEntry.create({
      data: {
        title: 'Test Gen Pain C',
        description: 'Problema de retenção de clientes',
        sectors: ['saas'],
        status: 'VALIDATED',
      },
    })
    const caseEntry = await prisma.caseLibraryEntry.create({
      data: {
        name: 'Test Gen Case C',
        sector: 'saas',
        systemType: 'SaaS',
        outcome: 'Aumentou retenção em 35% ao implementar onboarding estruturado no produto',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    })
    await prisma.casePain.create({ data: { caseId: caseEntry.id, painId: pain.id } })
    await prisma.solutionPattern.create({
      data: {
        name: 'Test Gen Pattern C',
        description: 'Onboarding estruturado',
        painId: pain.id,
        caseId: caseEntry.id,
      },
    })

    const first = await service.generate()
    expect(first.created).toBeGreaterThan(0)

    const second = await service.generate()
    expect(second.created).toBe(0)
    expect(second.skipped).toBeGreaterThan(0)

    const count = await prisma.theme.count({ where: { painId: pain.id, caseId: caseEntry.id } })
    expect(count).toBe(1) // nenhuma duplicata
  })

  it('forceRegenerate recalcula scores sem criar duplicatas', async () => {
    const pain = await prisma.painLibraryEntry.create({
      data: {
        title: 'Test Gen Pain D',
        description: 'Alta taxa de churn',
        sectors: ['saas'],
        status: 'VALIDATED',
      },
    })
    const caseEntry = await prisma.caseLibraryEntry.create({
      data: {
        name: 'Test Gen Case D',
        sector: 'saas',
        systemType: 'SaaS',
        outcome: 'Reduziu churn em 28% em 6 meses com programa de customer success',
        hasQuantifiableResult: true,
        status: 'VALIDATED',
      },
    })
    await prisma.casePain.create({ data: { caseId: caseEntry.id, painId: pain.id } })
    await prisma.solutionPattern.create({
      data: {
        name: 'Test Gen Pattern D',
        description: 'Programa de customer success',
        painId: pain.id,
        caseId: caseEntry.id,
      },
    })

    await service.generate()
    const before = await prisma.theme.count({ where: { painId: pain.id, caseId: caseEntry.id } })

    const result = await service.generate({ forceRegenerate: true })
    expect(result.created).toBe(0)
    expect(result.updated).toBeGreaterThan(0)

    const after = await prisma.theme.count({ where: { painId: pain.id, caseId: caseEntry.id } })
    expect(after).toBe(before) // sem duplicatas
  })

  it('durationMs é registrado no retorno', async () => {
    const result = await service.generate()
    expect(typeof result.durationMs).toBe('number')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
