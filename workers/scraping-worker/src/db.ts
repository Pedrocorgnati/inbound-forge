/**
 * Prisma Client Singleton — Scraping Worker
 * TASK-1 ST002 / module-6-scraping-worker
 *
 * Singleton para evitar múltiplas conexões no worker Railway.
 * Worker roda em Node.js (não Next.js) — sem hot-reload, não precisa
 * do padrão de globalThis do Next.js.
 */
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
    })
  }
  return prisma
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = undefined
  }
}
