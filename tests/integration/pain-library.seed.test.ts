/**
 * TASK-1/ST004 — Testes de idempotencia e threshold do pain_library seed.
 * Gate G003c: requer DB real rodando (vitest.integration.config.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { seedPainLibrary } from '../../prisma/seeds/pain-library.seed'
import { seedCaseLibrary } from '../../prisma/seeds/case-library.seed'
import { getValidatedThreshold } from '../../prisma/seeds/index'

const prisma = new PrismaClient()

describe('pain_library seed (canonical)', () => {
  beforeAll(async () => {
    await seedPainLibrary(prisma)
    await seedCaseLibrary(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('cria pelo menos 10 entradas VALIDATED em pain_library', async () => {
    const count = await prisma.painLibraryEntry.count({ where: { status: 'VALIDATED' } })
    expect(count).toBeGreaterThanOrEqual(10)
  })

  it('e idempotente: re-executar nao duplica entradas', async () => {
    const before = await prisma.painLibraryEntry.count()
    await seedPainLibrary(prisma)
    await seedCaseLibrary(prisma)
    const after = await prisma.painLibraryEntry.count()
    expect(after).toBe(before)
  })

  it('satisfaz threshold de ativacao (>=10 pains + >=5 cases)', async () => {
    const threshold = await getValidatedThreshold(prisma)
    expect(threshold.pains).toBeGreaterThanOrEqual(10)
    expect(threshold.cases).toBeGreaterThanOrEqual(5)
    expect(threshold.activated).toBe(true)
  })
})
