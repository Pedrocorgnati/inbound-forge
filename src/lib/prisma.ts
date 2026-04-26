import 'server-only'
import { PrismaClient } from '@prisma/client'

// Padrão oficial Prisma para Next.js: evita múltiplas instâncias em dev hot-reload.
// eslint-disable-next-line no-var
declare global { var prisma: PrismaClient | undefined }

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// ST007 (SYS_001): Verificação de conectividade em startup (dev only)
// Não expõe DATABASE_URL ou credenciais nas mensagens de erro (SEC-001)
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().catch((err: Error) => {
    console.error('[SYS_001] Prisma failed to connect on startup:', err.message)
    // Servidor inicia normalmente (fail gracefully) — falha lazy, não eagerly
  })
}
