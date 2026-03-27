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
