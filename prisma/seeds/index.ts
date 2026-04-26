/**
 * Indice canonical de seeds reutilizaveis (TASK-1/ST003).
 * Registra ordem: pain_library -> case_library -> solution_patterns.
 */
import type { PrismaClient } from '@prisma/client'
import { seedPainLibrary } from './pain-library.seed'
import { seedCaseLibrary } from './case-library.seed'

export { seedPainLibrary, seedCaseLibrary }

export async function seedCoreLibraries(prisma: PrismaClient) {
  console.log('🌱 [CORE] Seeding pain_library + case_library (canonical)...')
  await seedPainLibrary(prisma)
  await seedCaseLibrary(prisma)
}

export async function getValidatedThreshold(prisma: PrismaClient) {
  const [pains, cases] = await Promise.all([
    prisma.painLibraryEntry.count({ where: { status: 'VALIDATED' } }),
    prisma.caseLibraryEntry.count({ where: { status: 'VALIDATED' } }),
  ])
  return { pains, cases, activated: pains >= 10 && cases >= 5 }
}
