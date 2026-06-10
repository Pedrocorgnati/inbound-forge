/**
 * Publishing Worker Reaper (WK-WRK-03)
 *
 * Recupera entradas presas em PROCESSING quando o worker morre no meio de uma
 * publicacao (crash, deploy, SIGKILL). Diferente dos workers de imagem/video, o
 * publishing e DB-poll puro (sem Redis), entao o reaper reabre direto no banco:
 * a fila e a propria tabela publishingQueue (consumer le scheduledAt <= now).
 *
 * Espelha handleFailure de publisher.ts: estoura attempts -> FAILED (terminal),
 * senao volta para PENDING com scheduledAt = agora (para o poll re-capturar).
 */

import type { PrismaClient } from '@prisma/client'

// 15min e muito maior que qualquer publicacao individual (fetch interno),
// entao nunca reabre uma publicacao legitimamente em andamento.
const STALE_PROCESSING_MS = 15 * 60_000

export async function reapStalledPublishing(db: PrismaClient): Promise<number> {
  const threshold = new Date(Date.now() - STALE_PROCESSING_MS)

  const stalled = await db.publishingQueue.findMany({
    where: { status: 'PROCESSING', updatedAt: { lt: threshold } },
    select: { id: true, postId: true, attempts: true, maxAttempts: true },
  })

  for (const row of stalled) {
    const attempts = (row.attempts ?? 0) + 1
    const failed = attempts >= (row.maxAttempts ?? 3)

    if (failed) {
      await db.publishingQueue.update({
        where: { id: row.id },
        data: { status: 'FAILED', attempts, lastError: 'reaper: preso em PROCESSING (worker crash)' },
      })
      await db.post.update({
        where: { id: row.postId },
        data: { status: 'FAILED' },
      })
    } else {
      // scheduledAt = agora garante que o poll de processDuePosts (scheduledAt lte now) o recapture.
      await db.publishingQueue.update({
        where: { id: row.id },
        data: {
          status: 'PENDING',
          attempts,
          scheduledAt: new Date(),
          lastError: 'reaper: reaberto apos travar em PROCESSING',
        },
      })
    }

    log({ event: 'publishing_reaped', postId: row.postId, attempts, failed, timestamp: new Date().toISOString() })
  }

  return stalled.length
}

function log(data: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(data) + '\n')
}
