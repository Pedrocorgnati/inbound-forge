/**
 * Prisma Guard — verifica que o Prisma client foi gerado antes de prosseguir.
 * Executado no boot da aplicação via src/instrumentation.ts.
 *
 * Em caso de falha: VAL_001 — execute `npx prisma generate` e reinicie.
 */
import { ContentStatus } from '@/types/enums'

export function assertPrismaClientGenerated(): void {
  if (typeof ContentStatus === 'undefined') {
    throw new Error(
      '[VAL_001] Prisma client não encontrado. ' +
      'Execute `npx prisma generate` e reinicie o servidor. ' +
      'Se o problema persistir, verifique se o schema.prisma está correto.'
    )
  }
}
