/**
 * Entry Point de Seed — Inbound Forge
 * Criado por: auto-flow execute (module-1/TASK-2/ST001)
 *
 * Detecta ambiente via SEED_ENV ou NODE_ENV e executa o seed correto.
 * Uso:
 *   npx prisma db seed                         # dev
 *   SEED_ENV=test npx prisma db seed           # test
 *   SEED_ENV=production npx prisma db seed     # prod (requer OPERATOR_EMAIL)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const env = process.env.SEED_ENV ?? process.env.NODE_ENV ?? 'development'

  const { seedCoreLibraries } = await import('./seeds/index')
  await seedCoreLibraries(prisma)

  // Intake Review TASK-2 (CL-029/034): 10 dores MVP pre-configuradas.
  // Idempotente via upsert por title — seguro em todos os ambientes.
  const { seedMvpPains } = await import('./seed-mvp-pains')
  const mvp = await seedMvpPains(prisma)
  console.log(`[seed:mvp-pains] inseridas=${mvp.inserted} existentes=${mvp.existing}`)

  if (env === 'production') {
    const { seedProd } = await import('./seeds/prod')
    await seedProd(prisma)
  } else if (env === 'test') {
    const { seedTest } = await import('./seeds/test')
    await seedTest(prisma)
  } else {
    const { seedDev } = await import('./seeds/dev')
    await seedDev(prisma)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
