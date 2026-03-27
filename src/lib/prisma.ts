import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ST007 (SYS_001): Verificação de conectividade em startup (dev only)
// Não expõe DATABASE_URL ou credenciais nas mensagens de erro (SEC-001)
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().catch((err: Error) => {
    console.error('[SYS_001] Prisma failed to connect on startup:', err.message)
    // Servidor inicia normalmente (fail gracefully) — falha lazy, não eagerly
  })
}
