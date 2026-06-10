// Content generation lock — CL-052 (TASK-10 ST003)
// Previne geracao concorrente do mesmo ContentPiece via Redis SET NX EX.
import 'server-only'
import { redis } from '@/lib/redis'

const LOCK_TTL_SECONDS = 300 // 5 min (cobertura generosa para qualquer provider)

function lockKey(contentPieceId: string): string {
  return `content:lock:${contentPieceId}`
}

export class ContentPieceLocked extends Error {
  constructor(id: string) {
    super(`ContentPiece ${id} esta em geracao por outro processo`)
    this.name = 'ContentPieceLocked'
  }
}

/**
 * Adquire lock exclusivo para geracao de um ContentPiece.
 * Lanca ContentPieceLocked se ja houver geracao em andamento.
 * Sempre chamar release() no finally.
 */
export async function acquireContentLock(contentPieceId: string): Promise<() => Promise<void>> {
  const key = lockKey(contentPieceId)
  const acquired = await redis.set(key, '1', { nx: true, ex: LOCK_TTL_SECONDS })
  if (!acquired) {
    throw new ContentPieceLocked(contentPieceId)
  }
  return async () => {
    await redis.del(key)
  }
}

/**
 * Wrapper que adquire lock, executa fn, e libera no finally.
 * Propaga ContentPieceLocked se lock ja adquirido.
 */
export async function withContentPieceLock<T>(
  contentPieceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const release = await acquireContentLock(contentPieceId)
  try {
    return await fn()
  } finally {
    await release()
  }
}
