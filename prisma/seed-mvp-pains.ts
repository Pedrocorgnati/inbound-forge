/**
 * Seed MVP PainLibraryEntry — runner CLI
 * Intake Review TASK-2 (CL-029, CL-034)
 *
 * Fonte dos dados: `src/lib/onboarding/mvp-pains.ts` (reutilizado pela rota
 * POST /api/v1/onboarding/seed-defaults e por prisma/seed.ts).
 *
 * Uso:
 *   npm run db:seed:mvp
 *   ts-node --compiler-options {"module":"CommonJS"} prisma/seed-mvp-pains.ts
 */
import { PrismaClient } from '@prisma/client'
import { seedMvpPains, MVP_PAINS } from '../src/lib/onboarding/mvp-pains'

export { seedMvpPains, MVP_PAINS }

async function main() {
  const prisma = new PrismaClient()
  try {
    const { inserted, existing, total } = await seedMvpPains(prisma)
    console.log(
      `[seed:mvp-pains] inseridas=${inserted} existentes=${existing} total=${total}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seed:mvp-pains] falhou', err)
    process.exit(1)
  })
}
